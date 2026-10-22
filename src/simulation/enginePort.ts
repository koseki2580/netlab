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
import type { SimulationWorkerCommand } from './worker/protocol';

/**
 * What a simulation engine offers, wherever it runs: `MainThreadEngine` on the
 * page, `WorkerEngine` in front of a worker. `SimulationEngine` forwards every
 * call to one of them.
 */
export interface SimulationEnginePort {
  getState(): SimulationState;
  getTopology(): NetworkTopology;
  setState(state: SimulationState): void;
  subscribe(listener: (state: SimulationState) => void): () => void;
  precompute(packet: InFlightPacket, failureState?: FailureState): Promise<PacketTrace>;
  ping(srcNodeId: string, dstIp: string, options?: { ttl?: number }): Promise<PacketTrace>;
  traceroute(srcNodeId: string, dstIp: string, maxHops?: number): Promise<PacketTrace[]>;
  simulateDhcp(
    clientNodeId: string,
    failureState?: FailureState,
    sessionId?: string,
  ): Promise<boolean>;
  simulateDns(
    clientNodeId: string,
    hostname: string,
    failureState?: FailureState,
    sessionId?: string,
  ): Promise<string | null>;
  tcpConnect(
    clientNodeId: string,
    serverNodeId: string,
    srcPort: number,
    dstPort: number,
    failureState?: FailureState,
    sessionId?: string,
  ): Promise<TcpHandshakeResult>;
  tcpDisconnect(connectionId: string, failureState?: FailureState): Promise<TcpTeardownResult>;
  sendTransfer(
    srcNodeId: string,
    dstNodeId: string,
    payload: string,
    options?: DataTransferOptions,
  ): Promise<TransferMessage>;
  send(packet: InFlightPacket, failureState?: FailureState): Promise<void>;
  resend(failureState?: FailureState): Promise<void>;
  getLastPacket(): InFlightPacket | null;
  getTransferController(): DataTransferController | null;
  getPathMtuCache(nodeId: string): PathMtuCache;
  clearPathMtuCaches(): void;
  pmtuLookup(srcNodeId: string, dstIp: string): number;
  exportPcap(traceId?: string): Uint8Array;
  exportPcapRecords(traceId?: string): PcapRecord[];
  step(): void;
  setPlayInterval(ms: number): void;
  getPlayInterval(): number;
  setHighlightMode(mode: HighlightMode): void;
  play(ms?: number): void;
  pause(): void;
  reset(): void;
  clear(): void;
  clearTraces(): void;
  selectTrace(packetId: string): void;
  selectHop(step: number): void;
  getRuntimeNodeIp(nodeId: string): string | null;
  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null;
  getDnsCache(nodeId: string): DnsCache | null;
  getUdpBindings(nodeId: string): UdpBindings | null;
  getTcpConnections(): TcpConnection[];
  getTcpConnectionsForNode(nodeId: string): TcpConnection[];
  getMulticastTableSnapshot(switchId: string): MulticastTableEntry[];
  getIgmpMembershipSnapshot(routerId: string): { interfaceId: string; group: string }[];
  getJoinedGroups(nodeId: string): string[];
  addMulticastMembership(
    switchId: string,
    vlanId: number,
    multicastMac: string,
    portId: string,
  ): void;
  removeMulticastMembership(
    switchId: string,
    vlanId: number,
    multicastMac: string,
    portId: string,
  ): void;
  addJoinedGroup(nodeId: string, group: string): void;
  removeJoinedGroup(nodeId: string, group: string): void;
  dispose(): void;
}

/**
 * Every worker command that names an engine call must name one the port has.
 * The others set the worker up, or carry two calls in one (a join flag).
 */
type CommandCalls = Exclude<
  SimulationWorkerCommand['type'],
  'seed' | 'joinGroup' | 'multicastMembership'
>;
type MissingFromPort = Exclude<CommandCalls, keyof SimulationEnginePort>;
export const WORKER_COMMANDS_ARE_PORT_CALLS: [MissingFromPort] extends [never] ? true : never =
  true;
