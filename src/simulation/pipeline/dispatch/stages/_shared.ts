import type { FailureState } from '../../../../types/failure';
import type { ForwardContext } from '../../../../types/layers';
import { type IgmpMessage, type InFlightPacket, type IpPacket } from '../../../../types/packets';
import type { RouteEntry } from '../../../../types/routing';
import type {
  NatTranslation,
  Neighbor,
  ObservabilityTrace,
  PacketHop,
} from '../../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../../types/topology';
import { FlowCollector } from '../../../../observability/FlowCollector';
import type { NetflowExporter } from '../../../../observability/NetflowExporter';
import type { SflowSampler } from '../../../../observability/SflowSampler';
import type { LinkQueueRegistry } from '../../../LinkQueueRegistry';
import type { ServiceOrchestrator } from '../../../ServiceOrchestrator';
import type { TraceRecorder } from '../../../TraceRecorder';
import type { FrameMaterializer, IcmpBuilder } from '../../builders';
import type {
  InterfaceResolver,
  MacResolver,
  PortResolver,
  ResolvedInterface,
} from '../../resolvers';
import type { ArpDispatcher } from '../ArpDispatcher';
import type { ForwardLoopParams, ForwardLoopShared } from '../ForwardingLoop';
import type { AclMatchInfo } from '../../../../types/acl';

export const MAX_HOPS = 64;
export const BROADCAST_IP = '255.255.255.255';

export function isIgmpMessage(payload: IpPacket['payload']): payload is IgmpMessage {
  return 'igmpType' in payload && 'groupAddress' in payload;
}

type ArpTarget = NonNullable<ReturnType<ArpDispatcher['resolveTargetInfo']>>;

interface LoopReturn {
  stepCounter: number;
  generatedIcmpPackets: InFlightPacket[];
}

export type StageResult =
  | { kind: 'continue'; ctx: LoopContext }
  | { kind: 'break'; stepCounter: number }
  | { kind: 'return'; value: LoopReturn };

export interface ForwardingStageDependencies {
  topology: NetworkTopology;
  traceRecorder: TraceRecorder;
  services: ServiceOrchestrator;
  ifaceResolver: InterfaceResolver;
  macResolver: MacResolver;
  portResolver: PortResolver;
  icmpBuilder: IcmpBuilder;
  frameMaterializer: FrameMaterializer;
  arpDispatcher: ArpDispatcher;
  getEffectiveNodeIp: (node: NetlabNode | null) => string | undefined;
  getNeighborsFn: (
    currentNodeId: string,
    excludeNodeId: string | null,
    failureState: FailureState,
  ) => Neighbor[];
  appendLinkQosTrace: (
    hopBase: Omit<PacketHop, 'step'>,
    workingPacket: InFlightPacket,
    edgeId: string,
    stepCounter: number,
    hops: PacketHop[],
    snapshots: InFlightPacket[],
    failureState: FailureState,
    linkQueues: LinkQueueRegistry,
  ) => { stepCounter: number; dropped: boolean };
  appendObservabilityTrace: (
    hopBase: Omit<PacketHop, 'step'>,
    trace: ObservabilityTrace,
    workingPacket: InFlightPacket,
    stepCounter: number,
    hops: PacketHop[],
    snapshots: InFlightPacket[],
  ) => number;
  runFragment: (params: ForwardLoopParams, shared: ForwardLoopShared) => Promise<LoopReturn>;
}

export interface LoopContext {
  deps: ForwardingStageDependencies;
  shared: ForwardLoopShared;
  flowCollector: FlowCollector;
  netflowExporters: Map<string, NetflowExporter>;
  sflowSamplers: Map<string, SflowSampler>;
  generatedIcmpPackets: InFlightPacket[];
  baseTs: number;
  visitedStates: Set<string>;
  workingPacket: InFlightPacket;
  current: string;
  ingressFrom: string | null;
  ingressEdgeId: string | null;
  senderIp: string | null;
  stepCounter: number;
  node: NetlabNode | null;
  ipPacket: IpPacket | null;
  transport: IpPacket['payload'] | null;
  hopBase: Omit<PacketHop, 'step'> | null;
  packetBeforeHop: InFlightPacket | null;
  packetBeforeForward: InFlightPacket | null;
  natTranslation: NatTranslation | null;
  outsideToInsideMatched: boolean;
  ingressAclMatch: AclMatchInfo | null;
  egressAclMatch: AclMatchInfo | null;
  neighbors: Neighbor[];
  forwardCtx: ForwardContext | null;
  next: Neighbor | null;
  selectedRoute: RouteEntry | null;
  routerEgressInterface: ResolvedInterface | null;
  arpTarget: ArpTarget | null;
  forwardEvent: PacketHop['event'] | null;
  resolvedDstMac: string | null;
  forwardHop: Omit<PacketHop, 'step'> | null;
}

export function createLoopContext(
  params: ForwardLoopParams,
  shared: ForwardLoopShared,
  deps: ForwardingStageDependencies,
): LoopContext {
  return {
    deps,
    shared,
    flowCollector: shared.flowCollector ?? new FlowCollector(),
    netflowExporters: shared.netflowExporters ?? new Map<string, NetflowExporter>(),
    sflowSamplers: shared.sflowSamplers ?? new Map<string, SflowSampler>(),
    generatedIcmpPackets: [],
    baseTs: params.baseTs,
    visitedStates: params.visitedStates,
    workingPacket: params.packet,
    current: params.current,
    ingressFrom: params.ingressFrom,
    ingressEdgeId: params.ingressEdgeId,
    senderIp: params.senderIp,
    stepCounter: params.stepCounter,
    node: null,
    ipPacket: null,
    transport: null,
    hopBase: null,
    packetBeforeHop: null,
    packetBeforeForward: null,
    natTranslation: null,
    outsideToInsideMatched: false,
    ingressAclMatch: null,
    egressAclMatch: null,
    neighbors: [],
    forwardCtx: null,
    next: null,
    selectedRoute: null,
    routerEgressInterface: null,
    arpTarget: null,
    forwardEvent: null,
    resolvedDstMac: null,
    forwardHop: null,
  };
}

export function continueWith(ctx: LoopContext): StageResult {
  return { kind: 'continue', ctx };
}

export function breakWith(ctx: LoopContext): StageResult {
  return { kind: 'break', stepCounter: ctx.stepCounter };
}

export function appendHop(
  ctx: LoopContext,
  hop: Omit<PacketHop, 'step'>,
  packet: InFlightPacket,
): void {
  ctx.stepCounter = ctx.deps.traceRecorder.appendHop(
    ctx.shared.hops,
    ctx.shared.snapshots,
    ctx.deps.frameMaterializer.withPacketMacs(hop, packet),
    packet,
    ctx.stepCounter,
  );
}

export function requireNode(ctx: LoopContext): NetlabNode {
  if (!ctx.node) {
    throw new Error('ForwardingLoop stage requires node context');
  }
  return ctx.node;
}

export function requireHopBase(ctx: LoopContext): Omit<PacketHop, 'step'> {
  if (!ctx.hopBase) {
    throw new Error('ForwardingLoop stage requires hop base');
  }
  return ctx.hopBase;
}

export function requirePacketBeforeHop(ctx: LoopContext): InFlightPacket {
  if (!ctx.packetBeforeHop) {
    throw new Error('ForwardingLoop stage requires packetBeforeHop');
  }
  return ctx.packetBeforeHop;
}

export function buildLoopGuardKey(
  ctx: LoopContext,
  node: NetlabNode,
  packet: InFlightPacket,
  ingressEdgeId: string | null,
): string {
  if (node.data.role !== 'switch') {
    return node.id;
  }

  const ingressKey = packet.ingressPortId || ingressEdgeId || 'origin';
  return `${node.id}:${ingressKey}:${ctx.deps.portResolver.getForwardingVlanId(packet)}`;
}

export function appendDropHop(
  ctx: LoopContext,
  reason: string,
  packet: InFlightPacket,
  extras: Partial<Omit<PacketHop, 'step' | 'event' | 'reason'>> = {},
  options: {
    aclMatch?: AclMatchInfo | null;
    natTranslation?: NatTranslation | null;
    includeContextNat?: boolean;
  } = {},
): number {
  const dropHop: Omit<PacketHop, 'step'> = {
    ...requireHopBase(ctx),
    ...extras,
    event: 'drop',
    reason,
  };
  const aclMatch = options.aclMatch;
  if (aclMatch != null) {
    dropHop.aclMatch = aclMatch;
  }
  const natTranslation =
    options.natTranslation !== undefined
      ? options.natTranslation
      : options.includeContextNat === false
        ? null
        : ctx.natTranslation;
  if (natTranslation) {
    dropHop.natTranslation = natTranslation;
  }
  const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
    requirePacketBeforeHop(ctx),
    packet,
  );
  if (changedFields.length > 0) {
    dropHop.changedFields = changedFields;
  }
  appendHop(ctx, dropHop, packet);
  return ctx.stepCounter;
}

export function recordArpEntry(ctx: LoopContext, nodeId: string, ip: string, mac: string): void {
  if (!ip.trim() || !mac.trim()) return;
  ctx.shared.nodeArpTables[nodeId] ??= {};
  ctx.shared.nodeArpTables[nodeId][ip] = mac;
}
