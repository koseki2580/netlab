import type { SimulationState } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';

export interface ProtocolParameterSet {
  readonly tcp: {
    readonly initialWindow: number;
    readonly mss: number;
    readonly rto: number;
  };
  readonly ospf: {
    readonly helloIntervalMs: number;
    readonly deadIntervalMs: number;
  };
  readonly arp: {
    readonly cacheTtlMs: number;
  };
  readonly engine: {
    readonly tickMs: number;
    readonly maxTtl: number;
  };
}

export const DEFAULT_PARAMETERS: ProtocolParameterSet = Object.freeze({
  tcp: Object.freeze({
    initialWindow: 65535,
    mss: 1460,
    rto: 1000,
  }),
  ospf: Object.freeze({
    helloIntervalMs: 10000,
    deadIntervalMs: 40000,
  }),
  arp: Object.freeze({
    cacheTtlMs: 1800000,
  }),
  engine: Object.freeze({
    tickMs: 100,
    maxTtl: 64,
  }),
});

export interface SimulationSnapshot {
  readonly id: string;
  readonly capturedAt: number;
  readonly topology: NetworkTopology;
  readonly state: SimulationState;
  readonly parameters: ProtocolParameterSet;
}

export interface PacketRef {
  readonly kind: 'packet';
  readonly traceId: string;
  readonly hopIndex: number;
}

export interface NodeRef {
  readonly kind: 'node';
  readonly nodeId: string;
}

export interface InterfaceRef {
  readonly kind: 'interface';
  readonly nodeId: string;
  readonly ifaceId: string;
}

export interface EdgeRef {
  readonly kind: 'edge';
  readonly edgeId: string;
}

export type SandboxMode = 'alpha' | 'beta';

export interface StaticRoute {
  readonly id: string;
  readonly prefix: string;
  readonly nextHop: string;
  readonly outInterface: string;
  readonly metric: number;
}

export type NatRuleKind = 'snat' | 'dnat';

export interface NatRule {
  readonly id: string;
  readonly kind: NatRuleKind;
  readonly matchSrc?: string;
  readonly matchDst?: string;
  readonly translateTo: string;
  readonly outInterface: string;
}

export type AclAction = 'permit' | 'deny';

export interface SandboxAclRule {
  readonly id: string;
  readonly action: AclAction;
  readonly matchSrc?: string;
  readonly matchDst?: string;
  readonly proto?: 'tcp' | 'udp' | 'icmp' | 'any';
  readonly dstPort?: number;
  readonly order: number;
}

export type PacketFieldPath =
  | 'l2.srcMac'
  | 'l2.dstMac'
  | 'l3.srcIp'
  | 'l3.dstIp'
  | 'l3.ttl'
  | 'l3.protocol'
  | 'l4.srcPort'
  | 'l4.dstPort';

export type ParameterKey =
  | 'tcp.initialWindow'
  | 'tcp.mss'
  | 'tcp.rto'
  | 'ospf.helloIntervalMs'
  | 'ospf.deadIntervalMs'
  | 'arp.cacheTtlMs'
  | 'engine.tickMs'
  | 'engine.maxTtl';

export type TrafficProtocol = 'icmp' | 'tcp' | 'udp';

export interface TrafficFlow {
  readonly id: string;
  readonly srcNodeId: string;
  readonly dstNodeId: string;
  readonly protocol: TrafficProtocol;
  readonly dstPort?: number;
  readonly payload?: string;
  readonly ttl?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

export function isProtocolParameterSet(value: unknown): value is ProtocolParameterSet {
  if (!isRecord(value)) return false;
  const { tcp, ospf, arp, engine } = value;
  return (
    isRecord(tcp) &&
    hasNumber(tcp, 'initialWindow') &&
    hasNumber(tcp, 'mss') &&
    hasNumber(tcp, 'rto') &&
    isRecord(ospf) &&
    hasNumber(ospf, 'helloIntervalMs') &&
    hasNumber(ospf, 'deadIntervalMs') &&
    isRecord(arp) &&
    hasNumber(arp, 'cacheTtlMs') &&
    isRecord(engine) &&
    hasNumber(engine, 'tickMs') &&
    hasNumber(engine, 'maxTtl')
  );
}

export function isPacketRef(value: unknown): value is PacketRef {
  return (
    isRecord(value) &&
    value.kind === 'packet' &&
    hasString(value, 'traceId') &&
    hasNumber(value, 'hopIndex')
  );
}

export function isNodeRef(value: unknown): value is NodeRef {
  return isRecord(value) && value.kind === 'node' && hasString(value, 'nodeId');
}

export function isInterfaceRef(value: unknown): value is InterfaceRef {
  return (
    isRecord(value) &&
    value.kind === 'interface' &&
    hasString(value, 'nodeId') &&
    hasString(value, 'ifaceId')
  );
}

export function isEdgeRef(value: unknown): value is EdgeRef {
  return isRecord(value) && value.kind === 'edge' && hasString(value, 'edgeId');
}

export function isSandboxMode(value: unknown): value is SandboxMode {
  return value === 'alpha' || value === 'beta';
}

export function isStaticRoute(value: unknown): value is StaticRoute {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    hasString(value, 'prefix') &&
    hasString(value, 'nextHop') &&
    hasString(value, 'outInterface') &&
    hasNumber(value, 'metric')
  );
}

export function isNatRule(value: unknown): value is NatRule {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    (value.kind === 'snat' || value.kind === 'dnat') &&
    (value.matchSrc === undefined || typeof value.matchSrc === 'string') &&
    (value.matchDst === undefined || typeof value.matchDst === 'string') &&
    hasString(value, 'translateTo') &&
    hasString(value, 'outInterface')
  );
}

export function isAclRule(value: unknown): value is SandboxAclRule {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    (value.action === 'permit' || value.action === 'deny') &&
    (value.matchSrc === undefined || typeof value.matchSrc === 'string') &&
    (value.matchDst === undefined || typeof value.matchDst === 'string') &&
    (value.proto === undefined ||
      value.proto === 'tcp' ||
      value.proto === 'udp' ||
      value.proto === 'icmp' ||
      value.proto === 'any') &&
    (value.dstPort === undefined || hasNumber(value, 'dstPort')) &&
    hasNumber(value, 'order')
  );
}

export function isPacketFieldPath(value: unknown): value is PacketFieldPath {
  return (
    value === 'l2.srcMac' ||
    value === 'l2.dstMac' ||
    value === 'l3.srcIp' ||
    value === 'l3.dstIp' ||
    value === 'l3.ttl' ||
    value === 'l3.protocol' ||
    value === 'l4.srcPort' ||
    value === 'l4.dstPort'
  );
}

export function isParameterKey(value: unknown): value is ParameterKey {
  return (
    value === 'tcp.initialWindow' ||
    value === 'tcp.mss' ||
    value === 'tcp.rto' ||
    value === 'ospf.helloIntervalMs' ||
    value === 'ospf.deadIntervalMs' ||
    value === 'arp.cacheTtlMs' ||
    value === 'engine.tickMs' ||
    value === 'engine.maxTtl'
  );
}

export function isTrafficFlow(value: unknown): value is TrafficFlow {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    hasString(value, 'srcNodeId') &&
    hasString(value, 'dstNodeId') &&
    (value.protocol === 'icmp' || value.protocol === 'tcp' || value.protocol === 'udp') &&
    (value.dstPort === undefined || hasNumber(value, 'dstPort')) &&
    (value.payload === undefined || typeof value.payload === 'string') &&
    (value.ttl === undefined || hasNumber(value, 'ttl'))
  );
}

export function isSimulationSnapshot(value: unknown): value is SimulationSnapshot {
  if (!isRecord(value)) return false;
  return (
    hasString(value, 'id') &&
    hasNumber(value, 'capturedAt') &&
    isRecord(value.topology) &&
    isRecord(value.state) &&
    isProtocolParameterSet(value.parameters)
  );
}
