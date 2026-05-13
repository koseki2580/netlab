import { HookEngine } from '../../hooks/HookEngine';
import type { MulticastTableEntry } from '../../layers/l2-datalink/MulticastTable';
import type {
  TcpHandshakeResult,
  TcpTeardownResult,
} from '../../layers/l4-transport/TcpOrchestrator';
import { EMPTY_FAILURE_STATE, type FailureState } from '../../types/failure';
import type { InFlightPacket } from '../../types/packets';
import type { DhcpLeaseState, DnsCache } from '../../types/services';
import type { HighlightMode, PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import type { TransferMessage } from '../../types/transfer';
import type { UdpBindings } from '../../types/udp';
import type { TcpConnection } from '../../types/tcp';
import { buildPcap, type PcapRecord } from '../../utils/pcapSerializer';
import type { DataTransferController, DataTransferOptions } from '../DataTransferController';
import type { TraceDetailLevel } from '../TraceRecorder';
import { PathMtuCache } from '../PathMtuCache';
import {
  isSimulationWorkerEvent,
  makeRequestId,
  type SimulationRuntimeSnapshot,
  type SimulationWorkerEvent,
  type SimulationWorkerResult,
} from './protocol';
import { INITIAL_SIMULATION_STATE } from './initialState';

export interface WorkerLike {
  onmessage: ((event: MessageEvent<SimulationWorkerEvent>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface WorkerEngineOptions {
  readonly initialState?: SimulationState;
  readonly playIntervalMs?: number;
  readonly traceDetailLevel?: TraceDetailLevel;
  readonly timeoutMs?: number;
  readonly createWorker?: () => WorkerLike;
}

interface PendingRequest {
  readonly resolve: (value: SimulationWorkerResult) => void;
  readonly reject: (reason: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
  readonly resolveOn: 'ready' | 'result' | 'disposed';
}

interface CommandBody extends Record<string, unknown> {
  readonly type: string;
}

const EMPTY_RUNTIME: SimulationRuntimeSnapshot = {
  runtimeNodeIps: {},
  dhcpLeaseStates: {},
  dnsCaches: {},
  udpBindings: {},
  tcpConnections: [],
  joinedGroups: {},
  multicastTables: {},
  igmpMemberships: {},
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createDefaultWorker(): WorkerLike {
  return new Worker(new URL('./worker.entry.ts', import.meta.url), {
    type: 'module',
  }) as unknown as WorkerLike;
}

function resultError(message: string): Error {
  return new Error(`[netlab] simulation worker ${message}`);
}

function formatWorkerErrorDetail(detail: unknown): string {
  if (detail instanceof Error) {
    return `${detail.name}: ${detail.message}`;
  }
  if (typeof detail === 'object' && detail !== null) {
    try {
      return JSON.stringify(detail);
    } catch {
      return String(detail);
    }
  }
  return String(detail);
}

export class WorkerEngine {
  private worker: WorkerLike;
  private state: SimulationState;
  private runtime: SimulationRuntimeSnapshot = EMPTY_RUNTIME;
  private readonly topology: NetworkTopology;
  private readonly timeoutMs: number;
  private readonly createWorker: () => WorkerLike;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly listeners = new Set<(state: SimulationState) => void>();
  private playIntervalMs: number;
  private pcapRecords: PcapRecord[] = [];
  private readonly traceDetailLevel: TraceDetailLevel;
  private disposed = false;
  private readyPromise: Promise<void>;

  constructor(
    topology: NetworkTopology,
    private readonly hookEngine: HookEngine,
    opts: WorkerEngineOptions = {},
  ) {
    this.topology = clone(topology);
    this.state = clone(opts.initialState ?? INITIAL_SIMULATION_STATE);
    this.playIntervalMs = opts.playIntervalMs ?? 500;
    this.traceDetailLevel = opts.traceDetailLevel ?? 'full';
    this.timeoutMs = opts.timeoutMs ?? 5000;
    this.createWorker = opts.createWorker ?? createDefaultWorker;
    this.worker = this.createAndWireWorker();
    this.readyPromise = this.seedWorker();
    void this.readyPromise.catch(() => undefined);
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  getState(): SimulationState {
    return clone(this.state);
  }

  getTopology(): NetworkTopology {
    return clone(this.topology);
  }

  setState(state: SimulationState): void {
    this.state = clone(state);
    this.notify();
    this.fireAndForget({ type: 'setState', state });
  }

  subscribe(listener: (state: SimulationState) => void): () => void {
    if (this.disposed) {
      return () => undefined;
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async precompute(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<PacketTrace> {
    return (await this.request({ type: 'precompute', packet, failureState })) as PacketTrace;
  }

  async ping(srcNodeId: string, dstIp: string, options?: { ttl?: number }): Promise<PacketTrace> {
    const result = await this.request({ type: 'ping', srcNodeId, dstIp, options });
    await this.refreshPcapRecords();
    return result as PacketTrace;
  }

  async traceroute(srcNodeId: string, dstIp: string, maxHops = 30): Promise<PacketTrace[]> {
    const result = await this.request({ type: 'traceroute', srcNodeId, dstIp, maxHops });
    await this.refreshPcapRecords();
    return result as PacketTrace[];
  }

  async simulateDhcp(
    clientNodeId: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<boolean> {
    const result = await this.request({
      type: 'simulateDhcp',
      clientNodeId,
      failureState,
      sessionId,
    });
    await this.refreshPcapRecords();
    return Boolean(result);
  }

  async simulateDns(
    clientNodeId: string,
    hostname: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<string | null> {
    const result = await this.request({
      type: 'simulateDns',
      clientNodeId,
      hostname,
      failureState,
      sessionId,
    });
    await this.refreshPcapRecords();
    return typeof result === 'string' ? result : null;
  }

  async tcpConnect(
    clientNodeId: string,
    serverNodeId: string,
    srcPort: number,
    dstPort: number,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<TcpHandshakeResult> {
    const result = await this.request({
      type: 'tcpConnect',
      clientNodeId,
      serverNodeId,
      srcPort,
      dstPort,
      failureState,
      sessionId,
    });
    await this.refreshPcapRecords();
    return result as TcpHandshakeResult;
  }

  async tcpDisconnect(
    connectionId: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<TcpTeardownResult> {
    const result = await this.request({ type: 'tcpDisconnect', connectionId, failureState });
    await this.refreshPcapRecords();
    return result as TcpTeardownResult;
  }

  async sendTransfer(
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options?: DataTransferOptions,
  ): Promise<TransferMessage> {
    const result = await this.request({
      type: 'sendTransfer',
      srcNodeId,
      dstNodeId,
      payload,
      options,
    });
    await this.refreshPcapRecords();
    return result as TransferMessage;
  }

  async send(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<void> {
    await this.request({ type: 'send', packet, failureState });
    await this.refreshPcapRecords();
  }

  async resend(failureState?: FailureState): Promise<void> {
    const packet = this.getLastPacket();
    if (!packet) return;
    const timestamp = Date.now();
    await this.send(
      { ...packet, id: `pkt-${timestamp}`, timestamp },
      failureState ?? EMPTY_FAILURE_STATE,
    );
  }

  getLastPacket(): InFlightPacket | null {
    const currentTrace = this.state.traces.find(
      (trace) => trace.packetId === this.state.currentTraceId,
    );
    const packet = this.state.selectedPacket;
    if (packet) return packet;
    if (!currentTrace) return null;
    return null;
  }

  getTransferController(): DataTransferController | null {
    return null;
  }

  getPathMtuCache(_nodeId: string): PathMtuCache {
    return new PathMtuCache();
  }

  clearPathMtuCaches(): void {
    this.fireAndForget({ type: 'clearPathMtuCaches' });
  }

  pmtuLookup(_srcNodeId: string, _dstIp: string): number {
    return Number.POSITIVE_INFINITY;
  }

  exportPcap(traceId?: string): Uint8Array {
    return buildPcap(this.exportPcapRecords(traceId));
  }

  exportPcapRecords(_traceId?: string): PcapRecord[] {
    return clone(this.pcapRecords);
  }

  step(): void {
    this.fireAndForget({ type: 'step' });
  }

  setPlayInterval(ms: number): void {
    this.playIntervalMs = Math.max(50, Math.min(5000, ms));
    this.fireAndForget({ type: 'setPlayInterval', ms: this.playIntervalMs });
  }

  getPlayInterval(): number {
    return this.playIntervalMs;
  }

  setHighlightMode(mode: HighlightMode): void {
    this.state = { ...this.state, highlightMode: mode };
    this.notify();
    this.fireAndForget({ type: 'setHighlightMode', mode });
  }

  play(ms?: number): void {
    this.setPlayInterval(ms ?? this.playIntervalMs);
    this.state = { ...this.state, status: 'running' };
    this.notify();
  }

  pause(): void {
    if (this.state.status === 'running') {
      this.state = { ...this.state, status: 'paused' };
      this.notify();
    }
  }

  reset(): void {
    this.fireAndForget({ type: 'reset' });
  }

  clear(): void {
    this.state = clone(INITIAL_SIMULATION_STATE);
    this.pcapRecords = [];
    this.notify();
    this.fireAndForget({ type: 'clear' });
  }

  clearTraces(): void {
    this.pcapRecords = [];
    this.fireAndForget({ type: 'clearTraces' });
  }

  selectTrace(packetId: string): void {
    this.fireAndForget({ type: 'selectTrace', packetId });
  }

  selectHop(step: number): void {
    this.fireAndForget({ type: 'selectHop', step });
  }

  getRuntimeNodeIp(nodeId: string): string | null {
    return this.runtime.runtimeNodeIps[nodeId] ?? null;
  }

  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null {
    return this.runtime.dhcpLeaseStates[nodeId] ?? null;
  }

  getDnsCache(nodeId: string): DnsCache | null {
    return this.runtime.dnsCaches[nodeId] ?? null;
  }

  getUdpBindings(nodeId: string): UdpBindings | null {
    return this.runtime.udpBindings[nodeId] ?? null;
  }

  getTcpConnections(): TcpConnection[] {
    return clone([...this.runtime.tcpConnections]);
  }

  getTcpConnectionsForNode(nodeId: string): TcpConnection[] {
    return this.getTcpConnections().filter(
      (connection) => connection.srcNodeId === nodeId || connection.dstNodeId === nodeId,
    );
  }

  getMulticastTableSnapshot(switchId: string): MulticastTableEntry[] {
    return this.runtime.multicastTables[switchId] ?? [];
  }

  getIgmpMembershipSnapshot(routerId: string): { interfaceId: string; group: string }[] {
    return this.runtime.igmpMemberships[routerId] ?? [];
  }

  getJoinedGroups(nodeId: string): string[] {
    return this.runtime.joinedGroups[nodeId] ?? [];
  }

  addMulticastMembership(
    _switchId: string,
    _vlanId: number,
    _multicastMac: string,
    _portId: string,
  ): void {
    return undefined;
  }

  removeMulticastMembership(
    _switchId: string,
    _vlanId: number,
    _multicastMac: string,
    _portId: string,
  ): void {
    return undefined;
  }

  addJoinedGroup(_nodeId: string, _group: string): void {
    return undefined;
  }

  removeJoinedGroup(_nodeId: string, _group: string): void {
    return undefined;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.pending.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(resultError('was disposed'));
    });
    this.pending.clear();
    this.listeners.clear();
    this.worker.postMessage({ type: 'dispose', id: makeRequestId() });
    this.worker.terminate();
  }

  private createAndWireWorker(): WorkerLike {
    const worker = this.createWorker();
    worker.onmessage = (event) => this.handleEvent(event.data);
    worker.onerror = () => this.handleCrash('error');
    worker.onmessageerror = () => this.handleCrash('messageerror');
    return worker;
  }

  private seedWorker(): Promise<void> {
    return this.postCommand(
      {
        type: 'seed',
        topology: this.topology,
        state: this.state,
        playIntervalMs: this.playIntervalMs,
        traceDetailLevel: this.traceDetailLevel,
      },
      'ready',
    ).then(() => undefined);
  }

  private async request(command: CommandBody): Promise<SimulationWorkerResult> {
    await this.readyPromise;
    return this.postCommand(command, 'result');
  }

  private postCommand(
    command: CommandBody,
    resolveOn: PendingRequest['resolveOn'],
  ): Promise<SimulationWorkerResult> {
    if (this.disposed) {
      return Promise.reject(resultError('is disposed'));
    }

    const id = makeRequestId();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(resultError(`request ${id} timed out`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timeout, resolveOn });
      this.worker.postMessage({ ...command, id });
    });
  }

  private fireAndForget(command: CommandBody): void {
    void this.request(command)
      .then(() => this.refreshPcapRecords())
      .catch(() => undefined);
  }

  private handleEvent(rawEvent: unknown): void {
    if (!isSimulationWorkerEvent(rawEvent)) {
      return;
    }

    switch (rawEvent.type) {
      case 'ready':
        this.resolvePending(rawEvent.id, null, 'ready');
        break;
      case 'state':
        this.state = clone(rawEvent.state);
        this.runtime = clone(rawEvent.runtime);
        this.notify();
        break;
      case 'result':
        this.resolvePending(rawEvent.id, rawEvent.result, 'result');
        break;
      case 'hook':
        void this.hookEngine.emit(rawEvent.point, rawEvent.context as never);
        break;
      case 'error':
        this.rejectPending(
          rawEvent.id,
          resultError(`${rawEvent.code}: ${formatWorkerErrorDetail(rawEvent.detail)}`),
        );
        break;
      case 'disposed':
        this.resolvePending(rawEvent.id, null, 'disposed');
        break;
    }
  }

  private resolvePending(
    id: string,
    result: SimulationWorkerResult,
    kind: PendingRequest['resolveOn'],
  ): void {
    const pending = this.pending.get(id);
    if (!pending || pending.resolveOn !== kind) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(id);
    pending.resolve(result);
  }

  private rejectPending(id: string, error: Error): void {
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(id);
    pending.reject(error);
  }

  private handleCrash(reason: 'error' | 'messageerror'): void {
    if (this.disposed) {
      return;
    }

    this.pending.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(resultError(`crashed: ${reason}`));
    });
    this.pending.clear();
    this.worker.terminate();
    this.worker = this.createAndWireWorker();
    this.readyPromise = this.seedWorker();
    void this.readyPromise.catch(() => undefined);
    void this.hookEngine.emit('sandbox:engine-respawned', { reason });
  }

  private async refreshPcapRecords(): Promise<void> {
    const result = await this.request({ type: 'exportPcapRecords' });
    this.pcapRecords = (Array.isArray(result) ? result : []) as PcapRecord[];
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}
