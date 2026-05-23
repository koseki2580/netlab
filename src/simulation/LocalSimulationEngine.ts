import type { HookEngine } from '../hooks/HookEngine';
import type { TcpHandshakeResult, TcpTeardownResult } from '../layers/l4-transport/TcpOrchestrator';
import { EMPTY_FAILURE_STATE, type FailureState } from '../types/failure';
import type { InFlightPacket } from '../types/packets';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import type { HighlightMode, PacketTrace, SimulationState } from '../types/simulation';
import type { PcapRecord } from '../utils/pcapSerializer';
import type { TcpConnection } from '../types/tcp';
import type { NetworkTopology } from '../types/topology';
import type { TransferMessage } from '../types/transfer';
import type { UdpBindings } from '../types/udp';
import { getRequired } from '../utils/typedAccess';
import { DataTransferController, type DataTransferOptions } from './DataTransferController';
import { ForwardingPipeline } from './ForwardingPipeline';
import type { PathMtuCache } from './PathMtuCache';
import { HookEmitter } from './HookEmitter';
import { TraceCoordinator } from './TraceCoordinator';
import { extractPathEdgeIds } from './extractPathEdgeIds';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';
import type { TraceDetailLevel } from './TraceRecorder';

const DEFAULT_PLAY_INTERVAL_MS = 500;
const INITIAL_STATE: SimulationState = {
  status: 'idle',
  traces: [],
  currentTraceId: null,
  currentStep: -1,
  activeEdgeIds: [],
  activePathEdgeIds: [],
  highlightMode: 'path',
  traceColors: {},
  selectedHop: null,
  selectedPacket: null,
  nodeArpTables: {},
  natTables: [],
  connTrackTables: [],
};

export interface LocalSimulationEngineOptions {
  readonly traceDetailLevel?: TraceDetailLevel;
}

export class LocalSimulationEngine {
  private state: SimulationState = { ...INITIAL_STATE };
  private listeners = new Set<(state: SimulationState) => void>();
  private playTimer: ReturnType<typeof setInterval> | null = null;
  private playIntervalMs: number = DEFAULT_PLAY_INTERVAL_MS;
  private lastPacket: InFlightPacket | null = null;
  private lastFailureState: FailureState = EMPTY_FAILURE_STATE;
  private transferController: DataTransferController | null = null;
  private readonly traceRecorder: TraceRecorder;
  private readonly services: ServiceOrchestrator;
  private readonly traceCoordinator: TraceCoordinator;
  private readonly hookEmitter: HookEmitter;
  readonly pipeline: ForwardingPipeline;

  constructor(
    private readonly topology: NetworkTopology,
    hookEngine: HookEngine,
    opts: LocalSimulationEngineOptions = {},
  ) {
    this.traceRecorder = new TraceRecorder(
      opts.traceDetailLevel === undefined ? {} : { detailLevel: opts.traceDetailLevel },
    );
    this.services = new ServiceOrchestrator(topology, hookEngine);
    this.pipeline = new ForwardingPipeline(topology, hookEngine, this.traceRecorder, this.services);
    this.services.setPacketSender({
      precompute: (packet, failureState, options) =>
        this.pipeline.precompute(packet, failureState, options),
      findNode: (nodeId) => this.pipeline.findNode(nodeId) ?? undefined,
      getNeighbors: (nodeId, excludeNodeId = null, failureState = EMPTY_FAILURE_STATE) =>
        this.pipeline.getNeighbors(nodeId, excludeNodeId, failureState),
    });
    this.traceCoordinator = new TraceCoordinator(
      topology,
      this.pipeline,
      this.services,
      this.traceRecorder,
    );
    this.hookEmitter = new HookEmitter(hookEngine);
  }

  getState(): SimulationState {
    return this.serializeState();
  }

  getTopology(): NetworkTopology {
    return structuredClone(this.topology);
  }

  setState(state: SimulationState): void {
    this.clearPlay();
    this.state = structuredClone(state);
    this.notify();
  }

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

  async ping(srcNodeId: string, dstIp: string, options?: { ttl?: number }): Promise<PacketTrace> {
    const result = await this.pipeline.ping(srcNodeId, dstIp, options);
    this.commitTrace(result.trace, result.nodeArpTables);
    return result.trace;
  }

  async traceroute(srcNodeId: string, dstIp: string, maxHops = 30): Promise<PacketTrace[]> {
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

  async tcpConnect(
    clientNodeId: string,
    serverNodeId: string,
    srcPort: number,
    dstPort: number,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<TcpHandshakeResult> {
    return this.services.simulateTcpConnect(
      clientNodeId,
      serverNodeId,
      srcPort,
      dstPort,
      {
        appendTrace: (trace, nodeArpTables = {}) => this.commitTrace(trace, nodeArpTables),
        notify: () => this.notify(),
      },
      failureState,
      sessionId,
    );
  }

  async tcpDisconnect(
    connectionId: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<TcpTeardownResult> {
    return this.services.simulateTcpDisconnect(
      connectionId,
      {
        appendTrace: (trace, nodeArpTables = {}) => this.commitTrace(trace, nodeArpTables),
        notify: () => this.notify(),
      },
      failureState,
    );
  }

  async sendTransfer(
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options?: DataTransferOptions,
  ): Promise<TransferMessage> {
    if (!this.transferController) {
      this.transferController = new DataTransferController({
        engine: this,
        pipeline: this.pipeline,
      });
    }

    return this.transferController.startTransfer(srcNodeId, dstNodeId, payload, {
      ...options,
      pmtuLookup: options?.pmtuLookup ?? this.pmtuLookup.bind(this),
    });
  }

  async send(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<void> {
    this.clearPlay();
    this.lastPacket = packet;
    this.lastFailureState = failureState;
    const preparedPacket = await this.traceCoordinator.prepareForSend(packet, failureState, {
      appendTrace: (trace, nodeArpTables = {}) => this.commitTrace(trace, nodeArpTables),
      notify: () => this.notify(),
    });
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

  getTransferController(): DataTransferController | null {
    return this.transferController ?? null;
  }

  getPathMtuCache(nodeId: string): PathMtuCache {
    return this.traceCoordinator.getPathMtuCache(nodeId);
  }

  clearPathMtuCaches(): void {
    this.traceCoordinator.clearAllCacheEntries();
    this.notify();
  }

  pmtuLookup(srcNodeId: string, dstIp: string): number {
    return this.getPathMtuCache(srcNodeId).get(dstIp);
  }

  exportPcap(traceId?: string): Uint8Array {
    return this.traceRecorder.exportPcap(
      this.state.traces,
      traceId ?? this.state.currentTraceId ?? undefined,
    );
  }

  exportPcapRecords(traceId?: string): PcapRecord[] {
    return this.traceRecorder.exportPcapRecords(
      this.state.traces,
      traceId ?? this.state.currentTraceId ?? undefined,
    );
  }

  step(): void {
    const trace = this.currentTrace();
    if (!trace || this.state.status === 'done') return;

    const nextStep = this.state.currentStep + 1;
    if (nextStep >= trace.hops.length) return;

    const hop = getRequired(trace.hops, nextStep, {
      packetId: trace.packetId,
      reason: 'simulation-step-hop',
    });
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
      this.hookEmitter.emitForHop(hop, packetAtStep);
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

  setHighlightMode(mode: HighlightMode): void {
    if (this.state.highlightMode === mode) {
      return;
    }

    this.state = {
      ...this.state,
      highlightMode: mode,
    };
    this.notify();
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
    this.transferController?.clear();
    this.transferController = null;
    this.traceCoordinator.dropAllCaches();
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
      activePathEdgeIds: [],
      traceColors: {},
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
      activePathEdgeIds: extractPathEdgeIds(trace),
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

  getRuntimeNodeIp(nodeId: string): string | null {
    return this.services.getRuntimeNodeIp(nodeId);
  }

  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null {
    return this.services.getDhcpLeaseState(nodeId);
  }

  getDnsCache(nodeId: string): DnsCache | null {
    return this.services.getDnsCache(nodeId);
  }

  getUdpBindings(nodeId: string): UdpBindings | null {
    const node = this.topology.nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const role = node.data.role;
    if (role !== 'client' && role !== 'server') return null;

    const ip =
      this.services.getRuntimeNodeIp(nodeId) ??
      (typeof node.data.ip === 'string' ? node.data.ip : '0.0.0.0');
    const listening: UdpBindings['listening'] = [];
    const ephemeral: UdpBindings['ephemeral'] = [];

    if (node.data.dhcpServer) {
      listening.push({ ip, port: 67, owner: 'dhcp-server' });
    }
    if (node.data.dnsServer) {
      listening.push({ ip, port: 53, owner: 'dns' });
    }
    // DHCP client nodes listen on port 68
    const lease = this.services.getDhcpLeaseState(nodeId);
    if (lease && (role === 'client' || role === 'server')) {
      listening.push({ ip, port: 68, owner: 'dhcp-client' });
    }

    return { listening, ephemeral };
  }

  getTcpConnections(): TcpConnection[] {
    return this.services.getTcpConnections();
  }

  getTcpConnectionsForNode(nodeId: string): TcpConnection[] {
    return this.services.getTcpConnectionsForNode(nodeId);
  }

  getMulticastTableSnapshot(switchId: string) {
    return this.services.getMulticastTableSnapshot(switchId);
  }

  getIgmpMembershipSnapshot(routerId: string) {
    return this.services.getIgmpMembershipSnapshot(routerId);
  }

  getJoinedGroups(nodeId: string) {
    return this.services.getJoinedGroups(nodeId);
  }

  addMulticastMembership(
    switchId: string,
    vlanId: number,
    multicastMac: string,
    portId: string,
  ): void {
    this.services.getMulticastTable(switchId)?.addMembership(vlanId, multicastMac, portId);
  }

  removeMulticastMembership(
    switchId: string,
    vlanId: number,
    multicastMac: string,
    portId: string,
  ): void {
    this.services.getMulticastTable(switchId)?.removeMembership(vlanId, multicastMac, portId);
  }

  addJoinedGroup(nodeId: string, group: string): void {
    this.services.addJoinedGroup(nodeId, group);
  }

  removeJoinedGroup(nodeId: string, group: string): void {
    this.services.removeJoinedGroup(nodeId, group);
  }

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
    this.traceCoordinator.observePathMtuSignals(trace);
    this.notify();
  }

  private currentTrace(): PacketTrace | null {
    if (!this.state.currentTraceId) return null;
    return this.state.traces.find((trace) => trace.packetId === this.state.currentTraceId) ?? null;
  }

  private clearPlay(): void {
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }
}
