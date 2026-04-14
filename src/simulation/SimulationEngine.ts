import type { HookEngine } from '../hooks/HookEngine';
import type { NetworkTopology } from '../types/topology';
import type { HttpMessage, InFlightPacket, IpPacket } from '../types/packets';
import type { PacketHop, PacketTrace, SimulationState } from '../types/simulation';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import { type FailureState, EMPTY_FAILURE_STATE } from '../types/failure';
import { extractHostname, isIpAddress } from '../utils/network';
import { ForwardingPipeline } from './ForwardingPipeline';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';

const DEFAULT_PLAY_INTERVAL_MS = 500;
const INITIAL_STATE: SimulationState = {
  status: 'idle', traces: [], currentTraceId: null, currentStep: -1, activeEdgeIds: [],
  selectedHop: null, selectedPacket: null, nodeArpTables: {}, natTables: [], connTrackTables: [],
};

function isHttpPayload(payload: IpPacket['payload']): payload is IpPacket['payload'] & { payload: HttpMessage } {
  return 'seq' in payload && payload.payload.layer === 'L7' && 'headers' in payload.payload;
}

export class SimulationEngine {
  private state: SimulationState = { ...INITIAL_STATE };
  private listeners = new Set<(state: SimulationState) => void>();
  private playTimer: ReturnType<typeof setInterval> | null = null;
  private playIntervalMs: number = DEFAULT_PLAY_INTERVAL_MS;
  private lastPacket: InFlightPacket | null = null;
  private lastFailureState: FailureState = EMPTY_FAILURE_STATE;
  private readonly traceRecorder: TraceRecorder;
  private readonly services: ServiceOrchestrator;
  private readonly pipeline: ForwardingPipeline;

  constructor(
    topology: NetworkTopology,
    private readonly hookEngine: HookEngine,
  ) {
    this.traceRecorder = new TraceRecorder();
    this.services = new ServiceOrchestrator(topology, hookEngine);
    this.pipeline = new ForwardingPipeline(topology, hookEngine, this.traceRecorder, this.services);
    this.services.setPacketSender({
      precompute: (packet, failureState, options) => this.pipeline.precompute(packet, failureState, options),
      findNode: (nodeId) => this.pipeline.findNode(nodeId) ?? undefined,
      getNeighbors: (nodeId, excludeNodeId = null, failureState = EMPTY_FAILURE_STATE) =>
        this.pipeline.getNeighbors(nodeId, excludeNodeId, failureState),
    });
  }

  getState(): SimulationState { return this.serializeState(); }

  subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async precompute(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<PacketTrace> {
    const { trace } = await this.pipeline.precompute(packet, failureState);
    return trace;
  }

  async ping(
    srcNodeId: string,
    dstIp: string,
    options?: { ttl?: number },
  ): Promise<PacketTrace> {
    const result = await this.pipeline.ping(srcNodeId, dstIp, options);
    this.commitTrace(result.trace, result.nodeArpTables);
    return result.trace;
  }

  async traceroute(
    srcNodeId: string,
    dstIp: string,
    maxHops = 30,
  ): Promise<PacketTrace[]> {
    const results = await this.pipeline.traceroute(srcNodeId, dstIp, maxHops);
    results.forEach((result) => this.commitTrace(result.trace, result.nodeArpTables));
    return results.map((result) => result.trace);
  }

  async simulateDhcp(
    clientNodeId: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<boolean> {
    return this.services.simulateDhcp(
      clientNodeId,
      {
        appendTrace: (trace, nodeArpTables = {}) => this.commitTrace(trace, nodeArpTables),
        notify: () => this.notify(),
      },
      failureState,
      sessionId,
    );
  }

  async simulateDns(
    clientNodeId: string,
    hostname: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<string | null> {
    return this.services.simulateDns(
      clientNodeId,
      hostname,
      {
        appendTrace: (trace, nodeArpTables = {}) => this.commitTrace(trace, nodeArpTables),
        notify: () => this.notify(),
      },
      failureState,
      sessionId,
    );
  }

  async send(packet: InFlightPacket, failureState: FailureState = EMPTY_FAILURE_STATE): Promise<void> {
    this.clearPlay();
    this.lastPacket = packet;
    this.lastFailureState = failureState;
    const preparedPacket = await this.preparePacketForSend(packet, failureState);
    if (!preparedPacket) return;

    const { trace, nodeArpTables } = await this.pipeline.precompute(preparedPacket, failureState);
    this.commitTrace(trace, nodeArpTables);
  }

  async resend(failureState?: FailureState): Promise<void> {
    if (!this.lastPacket) return;

    const timestamp = Date.now();
    await this.send(
      {
        ...this.lastPacket,
        id: `pkt-${timestamp}`,
        timestamp,
      },
      failureState ?? this.lastFailureState,
    );
  }

  getLastPacket(): InFlightPacket | null {
    return this.lastPacket;
  }

  exportPcap(traceId?: string): Uint8Array {
    return this.traceRecorder.exportPcap(
      this.state.traces,
      traceId ?? this.state.currentTraceId ?? undefined,
    );
  }

  step(): void {
    const trace = this.currentTrace();
    if (!trace || this.state.status === 'done') return;

    const nextStep = this.state.currentStep + 1;
    if (nextStep >= trace.hops.length) return;

    const hop = trace.hops[nextStep];
    const snapshots = this.traceRecorder.getSnapshots(trace.packetId);
    const packetAtStep = snapshots[nextStep] ?? null;
    const isDone = nextStep === trace.hops.length - 1;

    this.state = {
      ...this.state,
      currentStep: nextStep,
      activeEdgeIds: hop.activeEdgeId ? [hop.activeEdgeId] : [],
      selectedHop: hop,
      selectedPacket: packetAtStep,
      status: isDone ? 'done' : this.state.status,
    };
    this.notify();

    if (packetAtStep) {
      this.emitHookForHop(hop, packetAtStep);
    }

    if (isDone) {
      this.clearPlay();
    }
  }

  setPlayInterval(ms: number): void {
    this.playIntervalMs = Math.max(50, Math.min(5000, ms));
    if (this.state.status === 'running') {
      this.clearPlay();
      this.playTimer = setInterval(() => this.step(), this.playIntervalMs);
    }
    this.notify();
  }

  getPlayInterval(): number {
    return this.playIntervalMs;
  }

  play(ms?: number): void {
    if (this.state.status === 'done' || this.state.status === 'running') return;
    const interval = ms ?? this.playIntervalMs;
    this.state = { ...this.state, status: 'running' };
    this.notify();
    this.playTimer = setInterval(() => this.step(), interval);
  }

  pause(): void {
    const wasRunning = this.state.status === 'running';
    this.clearPlay();
    if (wasRunning) {
      this.state = { ...this.state, status: 'paused' };
      this.notify();
    }
  }

  reset(): void {
    this.clearPlay();
    this.services.resetProcessors();
    this.state = {
      ...this.state,
      status: this.state.currentTraceId ? 'paused' : 'idle',
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
    };
    this.notify();
  }

  clear(): void {
    this.clearPlay();
    this.traceRecorder.clearSnapshots();
    this.services.clearAll();
    this.lastPacket = null;
    this.lastFailureState = EMPTY_FAILURE_STATE;
    this.state = { ...INITIAL_STATE };
    this.notify();
  }

  clearTraces(): void {
    this.clearPlay();
    this.traceRecorder.clearSnapshots();
    this.services.resetProcessors();
    this.lastPacket = null;
    this.lastFailureState = EMPTY_FAILURE_STATE;
    this.state = {
      ...this.state,
      status: 'idle',
      traces: [],
      currentTraceId: null,
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: {},
    };
    this.notify();
  }

  selectTrace(packetId: string): void {
    const trace = this.state.traces.find((candidate) => candidate.packetId === packetId);
    if (!trace) return;

    this.clearPlay();
    this.state = {
      ...this.state,
      status: 'paused',
      currentTraceId: trace.packetId,
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
    };
    this.notify();
  }

  selectHop(step: number): void {
    const trace = this.currentTrace();
    if (!trace) return;
    const hop = trace.hops[step];
    if (!hop) return;

    const packetAtStep = this.traceRecorder.getSnapshots(trace.packetId)[step] ?? null;
    this.state = {
      ...this.state,
      selectedHop: hop,
      activeEdgeIds: hop.activeEdgeId ? [hop.activeEdgeId] : [],
      selectedPacket: packetAtStep,
    };
    this.notify();
  }

  getRuntimeNodeIp(nodeId: string): string | null { return this.services.getRuntimeNodeIp(nodeId); }

  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null { return this.services.getDhcpLeaseState(nodeId); }

  getDnsCache(nodeId: string): DnsCache | null { return this.services.getDnsCache(nodeId); }

  private notify(): void {
    const snapshot = this.serializeState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private serializeState(): SimulationState {
    return {
      ...this.state,
      natTables: this.services.serializeNatTables(),
      connTrackTables: this.services.serializeConnTrackTables(),
    };
  }

  private mergeNodeArpTables(
    nodeArpTables: Record<string, Record<string, string>>,
  ): Record<string, Record<string, string>> {
    const mergedNodeArpTables = { ...this.state.nodeArpTables };
    for (const [nodeId, table] of Object.entries(nodeArpTables)) {
      mergedNodeArpTables[nodeId] = {
        ...(mergedNodeArpTables[nodeId] ?? {}),
        ...table,
      };
    }
    return mergedNodeArpTables;
  }

  private commitTrace(
    trace: PacketTrace,
    nodeArpTables: Record<string, Record<string, string>> = {},
  ): void {
    this.state = this.traceRecorder.appendTrace(
      this.state,
      trace,
      nodeArpTables,
      this.mergeNodeArpTables.bind(this),
    );
    this.notify();
  }

  private commitSyntheticDropTrace(packet: InFlightPacket, reason: string): void {
    const sourceNode = this.pipeline.findNode(packet.srcNodeId);
    const trace = this.traceRecorder.emitDropTrace(
      packet,
      reason,
      sourceNode?.data.label ?? packet.srcNodeId,
    );
    this.traceRecorder.setSnapshots(packet.id, [packet]);
    this.commitTrace(trace);
  }

  private async preparePacketForSend(
    packet: InFlightPacket,
    failureState: FailureState,
  ): Promise<InFlightPacket | null> {
    const sessionId = packet.sessionId ?? crypto.randomUUID();
    let workingPacket: InFlightPacket = { ...packet, sessionId };
    const sourceNode = this.pipeline.findNode(workingPacket.srcNodeId);

    if (
      sourceNode?.data.dhcpClient?.enabled &&
      this.services.getRuntimeNodeIp(sourceNode.id) === null
    ) {
      const bound = await this.simulateDhcp(sourceNode.id, failureState, sessionId);
      if (!bound) {
        this.commitSyntheticDropTrace(workingPacket, 'dhcp-assignment-failed');
        return null;
      }
    }

    const effectiveSrcIp = this.pipeline.getEffectiveNodeIp(sourceNode);
    if (effectiveSrcIp) {
      workingPacket = this.pipeline.withPacketIps(workingPacket, { srcIp: effectiveSrcIp });
    }

    const transport = workingPacket.frame.payload.payload;
    if (isHttpPayload(transport) && transport.payload.url) {
      const hostname = extractHostname(transport.payload.url);
      if (hostname && !isIpAddress(hostname)) {
        const resolvedIp = await this.simulateDns(
          workingPacket.srcNodeId,
          hostname,
          failureState,
          sessionId,
        );
        if (!resolvedIp) {
          this.commitSyntheticDropTrace(workingPacket, 'dns-resolution-failed');
          return null;
        }
        workingPacket = this.pipeline.withPacketIps(workingPacket, { dstIp: resolvedIp });
      }
    }

    return workingPacket;
  }

  private currentTrace(): PacketTrace | null {
    if (!this.state.currentTraceId) return null;
    return this.state.traces.find((trace) => trace.packetId === this.state.currentTraceId) ?? null;
  }

  private emitHookForHop(hop: PacketHop, packet: InFlightPacket): void {
    switch (hop.event) {
      case 'create':
        void this.hookEngine.emit('packet:create', { packet, sourceNodeId: hop.nodeId });
        break;
      case 'forward':
        void this.hookEngine.emit('packet:forward', {
          packet,
          fromNodeId: hop.fromNodeId ?? hop.nodeId,
          toNodeId: hop.toNodeId ?? '',
          decision: {
            action: 'forward',
            nextNodeId: hop.toNodeId ?? '',
            edgeId: hop.activeEdgeId ?? '',
            egressPort: hop.egressInterfaceId ?? hop.activeEdgeId ?? '',
            egressInterfaceId: hop.egressInterfaceId,
            packet,
          },
        });
        break;
      case 'deliver':
        void this.hookEngine.emit('packet:deliver', { packet, destinationNodeId: hop.nodeId });
        break;
      case 'drop':
        void this.hookEngine.emit('packet:drop', {
          packet,
          nodeId: hop.nodeId,
          reason: hop.reason ?? 'unknown',
        });
        break;
      case 'arp-request':
      case 'arp-reply':
        break;
    }
  }

  private clearPlay(): void {
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }
}
