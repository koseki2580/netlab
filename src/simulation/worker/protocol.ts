import type { DataTransferOptions } from '../DataTransferController';
import type {
  TcpHandshakeResult,
  TcpTeardownResult,
} from '../../layers/l4-transport/TcpOrchestrator';
import type { FailureState } from '../../types/failure';
import type { HookPoint } from '../../types/hooks';
import type { InFlightPacket } from '../../types/packets';
import type { PcapRecord } from '../../utils/pcapSerializer';
import type { DhcpLeaseState, DnsCache } from '../../types/services';
import type { HighlightMode, PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import type { TransferMessage } from '../../types/transfer';
import type { UdpBindings } from '../../types/udp';
import type { TcpConnection } from '../../types/tcp';
import type { MulticastTableEntry } from '../../layers/l2-datalink/MulticastTable';
import type { TraceDetailLevel } from '../TraceRecorder';

export interface SimulationRuntimeSnapshot {
  readonly runtimeNodeIps: Readonly<Record<string, string | null>>;
  readonly dhcpLeaseStates: Readonly<Record<string, DhcpLeaseState | null>>;
  readonly dnsCaches: Readonly<Record<string, DnsCache | null>>;
  readonly udpBindings: Readonly<Record<string, UdpBindings | null>>;
  readonly tcpConnections: readonly TcpConnection[];
  readonly joinedGroups: Readonly<Record<string, string[]>>;
  readonly multicastTables: Readonly<Record<string, MulticastTableEntry[]>>;
  readonly igmpMemberships: Readonly<Record<string, { interfaceId: string; group: string }[]>>;
}

export type SimulationWorkerCommand =
  | {
      readonly type: 'seed';
      readonly id: string;
      readonly topology: NetworkTopology;
      readonly state: SimulationState;
      readonly playIntervalMs: number;
      readonly traceDetailLevel?: TraceDetailLevel;
    }
  | { readonly type: 'getState'; readonly id: string }
  | { readonly type: 'setState'; readonly id: string; readonly state: SimulationState }
  | { readonly type: 'step'; readonly id: string }
  | {
      readonly type: 'precompute';
      readonly id: string;
      readonly packet: InFlightPacket;
      readonly failureState?: FailureState;
    }
  | {
      readonly type: 'send';
      readonly id: string;
      readonly packet: InFlightPacket;
      readonly failureState?: FailureState;
    }
  | {
      readonly type: 'ping';
      readonly id: string;
      readonly srcNodeId: string;
      readonly dstIp: string;
      readonly options?: { readonly ttl?: number };
    }
  | {
      readonly type: 'traceroute';
      readonly id: string;
      readonly srcNodeId: string;
      readonly dstIp: string;
      readonly maxHops?: number;
    }
  | {
      readonly type: 'simulateDhcp';
      readonly id: string;
      readonly clientNodeId: string;
      readonly failureState?: FailureState;
      readonly sessionId?: string;
    }
  | {
      readonly type: 'simulateDns';
      readonly id: string;
      readonly clientNodeId: string;
      readonly hostname: string;
      readonly failureState?: FailureState;
      readonly sessionId?: string;
    }
  | {
      readonly type: 'tcpConnect';
      readonly id: string;
      readonly clientNodeId: string;
      readonly serverNodeId: string;
      readonly srcPort: number;
      readonly dstPort: number;
      readonly failureState?: FailureState;
      readonly sessionId?: string;
    }
  | {
      readonly type: 'tcpDisconnect';
      readonly id: string;
      readonly connectionId: string;
      readonly failureState?: FailureState;
    }
  | {
      readonly type: 'sendTransfer';
      readonly id: string;
      readonly srcNodeId: string;
      readonly dstNodeId: string;
      readonly payload: string;
      readonly options?: DataTransferOptions;
    }
  | {
      readonly type: 'joinGroup';
      readonly id: string;
      readonly nodeId: string;
      readonly group: string;
      readonly join: boolean;
    }
  | {
      readonly type: 'multicastMembership';
      readonly id: string;
      readonly switchId: string;
      readonly vlanId: number;
      readonly multicastMac: string;
      readonly portId: string;
      readonly join: boolean;
    }
  | { readonly type: 'reset'; readonly id: string }
  | { readonly type: 'clear'; readonly id: string }
  | { readonly type: 'clearPathMtuCaches'; readonly id: string }
  | { readonly type: 'clearTraces'; readonly id: string }
  | { readonly type: 'selectTrace'; readonly id: string; readonly packetId: string }
  | { readonly type: 'selectHop'; readonly id: string; readonly step: number }
  | { readonly type: 'setPlayInterval'; readonly id: string; readonly ms: number }
  | { readonly type: 'setHighlightMode'; readonly id: string; readonly mode: HighlightMode }
  | { readonly type: 'exportPcapRecords'; readonly id: string; readonly traceId?: string }
  | { readonly type: 'dispose'; readonly id: string };

export type SimulationWorkerResult =
  | void
  | null
  | boolean
  | string
  | PacketTrace
  | readonly PacketTrace[]
  | TcpHandshakeResult
  | TcpTeardownResult
  | TransferMessage
  | readonly PcapRecord[];

export type SimulationWorkerEvent =
  | { readonly type: 'ready'; readonly id: string }
  | {
      readonly type: 'state';
      readonly id: string;
      readonly state: SimulationState;
      readonly runtime: SimulationRuntimeSnapshot;
    }
  | { readonly type: 'result'; readonly id: string; readonly result: SimulationWorkerResult }
  | {
      readonly type: 'hook';
      readonly id: string;
      readonly point: HookPoint;
      readonly context: unknown;
    }
  | { readonly type: 'error'; readonly id: string; readonly code: string; readonly detail: unknown }
  | { readonly type: 'disposed'; readonly id: string };

let nextRequestId = 1;

export function makeRequestId(): string {
  const id = nextRequestId;
  nextRequestId += 1;
  return `req-${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasId(value: Record<string, unknown>): value is Record<string, unknown> & { id: string } {
  return typeof value.id === 'string' && value.id.length > 0;
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

function hasPositiveNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] > 0;
}

function hasFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

function hasObject(value: Record<string, unknown>, key: string): boolean {
  return isRecord(value[key]);
}

function hasStateShape(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.status === 'string' &&
    Array.isArray(value.traces) &&
    hasFiniteNumber(value, 'currentStep')
  );
}

function hasTopologyShape(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.edges);
}

function isHighlightMode(value: unknown): value is HighlightMode {
  return value === 'path' || value === 'hop';
}

function isTraceDetailLevel(value: unknown): value is TraceDetailLevel {
  return value === 'full' || value === 'metadata-only';
}

export function isSimulationWorkerCommand(value: unknown): value is SimulationWorkerCommand {
  if (!isRecord(value) || !hasId(value) || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'seed':
      return (
        hasTopologyShape(value.topology) &&
        hasStateShape(value.state) &&
        hasPositiveNumber(value, 'playIntervalMs') &&
        (value.traceDetailLevel === undefined || isTraceDetailLevel(value.traceDetailLevel))
      );
    case 'getState':
    case 'step':
    case 'reset':
    case 'clear':
    case 'clearPathMtuCaches':
    case 'clearTraces':
    case 'dispose':
      return true;
    case 'setState':
      return hasStateShape(value.state);
    case 'send':
    case 'precompute':
      return hasObject(value, 'packet');
    case 'ping':
      return hasString(value, 'srcNodeId') && hasString(value, 'dstIp');
    case 'joinGroup':
      return (
        hasString(value, 'nodeId') && hasString(value, 'group') && typeof value.join === 'boolean'
      );
    case 'multicastMembership':
      return (
        hasString(value, 'switchId') &&
        typeof value.vlanId === 'number' &&
        hasString(value, 'multicastMac') &&
        hasString(value, 'portId') &&
        typeof value.join === 'boolean'
      );
    case 'traceroute':
      return (
        hasString(value, 'srcNodeId') &&
        hasString(value, 'dstIp') &&
        (value.maxHops === undefined || hasPositiveNumber(value, 'maxHops'))
      );
    case 'simulateDhcp':
      return hasString(value, 'clientNodeId');
    case 'simulateDns':
      return hasString(value, 'clientNodeId') && hasString(value, 'hostname');
    case 'tcpConnect':
      return (
        hasString(value, 'clientNodeId') &&
        hasString(value, 'serverNodeId') &&
        hasPositiveNumber(value, 'srcPort') &&
        hasPositiveNumber(value, 'dstPort')
      );
    case 'tcpDisconnect':
      return hasString(value, 'connectionId');
    case 'sendTransfer':
      return (
        hasString(value, 'srcNodeId') &&
        hasString(value, 'dstNodeId') &&
        hasString(value, 'payload')
      );
    case 'selectTrace':
      return hasString(value, 'packetId');
    case 'selectHop':
      return hasFiniteNumber(value, 'step');
    case 'setPlayInterval':
      return hasPositiveNumber(value, 'ms');
    case 'setHighlightMode':
      return isHighlightMode(value.mode);
    case 'exportPcapRecords':
      return value.traceId === undefined || hasString(value, 'traceId');
    default:
      return false;
  }
}

export function isSimulationWorkerHookEvent(
  value: unknown,
): value is Extract<SimulationWorkerEvent, { type: 'hook' }> {
  return (
    isRecord(value) &&
    value.type === 'hook' &&
    hasId(value) &&
    typeof value.point === 'string' &&
    'context' in value
  );
}

export function isSimulationWorkerEvent(value: unknown): value is SimulationWorkerEvent {
  if (!isRecord(value) || !hasId(value) || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'ready':
    case 'disposed':
      return true;
    case 'state':
      return hasStateShape(value.state) && hasObject(value, 'runtime');
    case 'result':
      return 'result' in value;
    case 'hook':
      return isSimulationWorkerHookEvent(value);
    case 'error':
      return hasString(value, 'code') && 'detail' in value;
    default:
      return false;
  }
}
