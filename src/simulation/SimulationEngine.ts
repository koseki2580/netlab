import type { HookEngine } from '../hooks/HookEngine';
import type { MulticastTableEntry } from '../layers/l2-datalink/MulticastTable';
import type { TcpHandshakeResult, TcpTeardownResult } from '../layers/l4-transport/TcpOrchestrator';
import type { FailureState } from '../types/failure';
import type { InFlightPacket } from '../types/packets';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import type { HighlightMode, PacketTrace, SimulationState } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import type { TransferMessage } from '../types/transfer';
import type { UdpBindings } from '../types/udp';
import type { TcpConnection } from '../types/tcp';
import type { PcapRecord } from '../utils/pcapSerializer';
import type { DataTransferController, DataTransferOptions } from './DataTransferController';
import type { PathMtuCache } from './PathMtuCache';
import type { TraceDetailLevel } from './TraceRecorder';
import { MainThreadEngine } from './worker/MainThreadEngine';
import { WorkerEngine, type WorkerEngineOptions } from './worker/WorkerEngine';

export interface SimulationEngineOptions extends WorkerEngineOptions {
  readonly useMainThread?: boolean;
  readonly traceDetailLevel?: TraceDetailLevel;
}

type SimulationEngineImpl = MainThreadEngine | WorkerEngine;

function shouldUseWorker(opts: SimulationEngineOptions): boolean {
  return !opts.useMainThread && (opts.createWorker !== undefined || typeof Worker !== 'undefined');
}

export class SimulationEngine {
  readonly hookEngine: HookEngine;
  readonly pipeline: unknown;
  private readonly impl: SimulationEngineImpl;

  constructor(
    topology: NetworkTopology,
    hookEngine: HookEngine,
    opts: SimulationEngineOptions = {},
  ) {
    this.hookEngine = hookEngine;
    this.impl = shouldUseWorker(opts)
      ? new WorkerEngine(topology, hookEngine, opts)
      : new MainThreadEngine(topology, hookEngine, opts);
    this.pipeline = Reflect.get(this.impl as object, 'pipeline');
  }

  getState(): SimulationState {
    return this.impl.getState();
  }

  getTopology(): NetworkTopology {
    return this.impl.getTopology();
  }

  setState(state: SimulationState): void {
    this.impl.setState(state);
  }

  subscribe(listener: (state: SimulationState) => void): () => void {
    return this.impl.subscribe(listener);
  }

  precompute(packet: InFlightPacket, failureState?: FailureState): Promise<PacketTrace> {
    return this.impl.precompute(packet, failureState);
  }

  ping(srcNodeId: string, dstIp: string, options?: { ttl?: number }): Promise<PacketTrace> {
    return this.impl.ping(srcNodeId, dstIp, options);
  }

  traceroute(srcNodeId: string, dstIp: string, maxHops?: number): Promise<PacketTrace[]> {
    return this.impl.traceroute(srcNodeId, dstIp, maxHops);
  }

  simulateDhcp(
    clientNodeId: string,
    failureState?: FailureState,
    sessionId?: string,
  ): Promise<boolean> {
    return this.impl.simulateDhcp(clientNodeId, failureState, sessionId);
  }

  simulateDns(
    clientNodeId: string,
    hostname: string,
    failureState?: FailureState,
    sessionId?: string,
  ): Promise<string | null> {
    return this.impl.simulateDns(clientNodeId, hostname, failureState, sessionId);
  }

  tcpConnect(
    clientNodeId: string,
    serverNodeId: string,
    srcPort: number,
    dstPort: number,
    failureState?: FailureState,
    sessionId?: string,
  ): Promise<TcpHandshakeResult> {
    return this.impl.tcpConnect(
      clientNodeId,
      serverNodeId,
      srcPort,
      dstPort,
      failureState,
      sessionId,
    );
  }

  tcpDisconnect(connectionId: string, failureState?: FailureState): Promise<TcpTeardownResult> {
    return this.impl.tcpDisconnect(connectionId, failureState);
  }

  sendTransfer(
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options?: DataTransferOptions,
  ): Promise<TransferMessage> {
    return this.impl.sendTransfer(srcNodeId, dstNodeId, payload, options);
  }

  send(packet: InFlightPacket, failureState?: FailureState): Promise<void> {
    return this.impl.send(packet, failureState);
  }

  resend(failureState?: FailureState): Promise<void> {
    if (failureState !== undefined) {
      const packet = this.getLastPacket();
      if (!packet) return Promise.resolve();
      const timestamp = Date.now();
      return this.send({ ...packet, id: `pkt-${timestamp}`, timestamp }, failureState);
    }

    return this.impl.resend(failureState);
  }

  getLastPacket(): InFlightPacket | null {
    return this.impl.getLastPacket();
  }

  getTransferController(): DataTransferController | null {
    return this.impl.getTransferController();
  }

  getPathMtuCache(nodeId: string): PathMtuCache {
    return this.impl.getPathMtuCache(nodeId);
  }

  clearPathMtuCaches(): void {
    this.impl.clearPathMtuCaches();
  }

  pmtuLookup(srcNodeId: string, dstIp: string): number {
    return this.impl.pmtuLookup(srcNodeId, dstIp);
  }

  exportPcap(traceId?: string): Uint8Array {
    return this.impl.exportPcap(traceId);
  }

  exportPcapRecords(traceId?: string): PcapRecord[] {
    return this.impl.exportPcapRecords(traceId);
  }

  step(): void {
    this.impl.step();
  }

  setPlayInterval(ms: number): void {
    this.impl.setPlayInterval(ms);
  }

  getPlayInterval(): number {
    return this.impl.getPlayInterval();
  }

  setHighlightMode(mode: HighlightMode): void {
    this.impl.setHighlightMode(mode);
  }

  play(ms?: number): void {
    this.impl.play(ms);
  }

  pause(): void {
    this.impl.pause();
  }

  reset(): void {
    this.impl.reset();
  }

  clear(): void {
    this.impl.clear();
  }

  clearTraces(): void {
    this.impl.clearTraces();
  }

  selectTrace(packetId: string): void {
    this.impl.selectTrace(packetId);
  }

  selectHop(step: number): void {
    this.impl.selectHop(step);
  }

  getRuntimeNodeIp(nodeId: string): string | null {
    return this.impl.getRuntimeNodeIp(nodeId);
  }

  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null {
    return this.impl.getDhcpLeaseState(nodeId);
  }

  getDnsCache(nodeId: string): DnsCache | null {
    return this.impl.getDnsCache(nodeId);
  }

  getUdpBindings(nodeId: string): UdpBindings | null {
    return this.impl.getUdpBindings(nodeId);
  }

  getTcpConnections(): TcpConnection[] {
    return this.impl.getTcpConnections();
  }

  getTcpConnectionsForNode(nodeId: string): TcpConnection[] {
    return this.impl.getTcpConnectionsForNode(nodeId);
  }

  getMulticastTableSnapshot(switchId: string): MulticastTableEntry[] {
    return this.impl.getMulticastTableSnapshot(switchId);
  }

  getIgmpMembershipSnapshot(routerId: string): { interfaceId: string; group: string }[] {
    return this.impl.getIgmpMembershipSnapshot(routerId);
  }

  getJoinedGroups(nodeId: string): string[] {
    return this.impl.getJoinedGroups(nodeId);
  }

  addMulticastMembership(
    switchId: string,
    vlanId: number,
    multicastMac: string,
    portId: string,
  ): void {
    this.impl.addMulticastMembership(switchId, vlanId, multicastMac, portId);
  }

  removeMulticastMembership(
    switchId: string,
    vlanId: number,
    multicastMac: string,
    portId: string,
  ): void {
    this.impl.removeMulticastMembership(switchId, vlanId, multicastMac, portId);
  }

  addJoinedGroup(nodeId: string, group: string): void {
    this.impl.addJoinedGroup(nodeId, group);
  }

  removeJoinedGroup(nodeId: string, group: string): void {
    this.impl.removeJoinedGroup(nodeId, group);
  }

  dispose(): void {
    this.impl.dispose();
  }
}
