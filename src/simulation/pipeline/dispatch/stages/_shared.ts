import type { FailureState } from '../../../../types/failure';
import type { ForwardContext } from '../../../../types/layers';
import { type IgmpMessage, type InFlightPacket, type IpPacket } from '../../../../types/packets';
import type { RouteEntry } from '../../../../types/routing';
import type { NatTranslation, Neighbor, PacketHop } from '../../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../../types/topology';
import { FlowCollector } from '../../../../observability/FlowCollector';
import type { NetflowExporter } from '../../../../observability/NetflowExporter';
import type { SflowSampler } from '../../../../observability/SflowSampler';
import type { AddressPlane } from '../../../AddressPlane';
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
  addresses: AddressPlane;
  getNeighborsFn: (
    currentNodeId: string,
    excludeNodeId: string | null,
    failureState: FailureState,
  ) => Neighbor[];
  runFragment: (params: ForwardLoopParams, shared: ForwardLoopShared) => Promise<LoopReturn>;
}

/** What lives for one traversal: where the packet is, and the trace so far. */
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
  /** This hop's facts; made afresh by the preflight stage. */
  hop: HopFacts | null;
  /**
   * This hop's routing; made afresh by the pre-routing stage. Before that
   * stage runs it is still the previous hop's record, which a drop at the
   * delivery stage reads (as it always has).
   */
  routing: HopRouting | null;
}

/** The device and packet at this hop, and the hop entry every later one starts from. */
export interface HopFacts {
  node: NetlabNode;
  ipPacket: IpPacket;
  transport: IpPacket['payload'];
  base: Omit<PacketHop, 'step'>;
}

/** What the routing stages decide at this hop, from pre-routing to the forward. */
export interface HopRouting {
  /** The packet as it reached pre-routing. */
  packetBeforeHop: InFlightPacket;
  /** The packet before ARP was injected, when it was. */
  packetBeforeForward: InFlightPacket | null;
  natTranslation: NatTranslation | null;
  outsideToInsideMatched: boolean;
  ingressAclMatch: AclMatchInfo | null;
  egressAclMatch: AclMatchInfo | null;
  neighbors: Neighbor[];
  forwardCtx: ForwardContext;
  /** Set by the forwarder dispatch. */
  next: Neighbor | null;
  selectedRoute: RouteEntry | null;
  /** The next hop the router's forwarding decision named; null off a router. */
  nextHopIp: string | null;
  routerEgressInterface: ResolvedInterface | null;
  /** Set by ARP injection. */
  arpTarget: ArpTarget | null;
  forwardEvent: PacketHop['event'] | null;
  resolvedDstMac: string | null;
  /** Set by the observability stage. */
  forwardHop: Omit<PacketHop, 'step'> | null;
}

/** A stage after preflight: the hop's facts are known. */
export type HopContext = LoopContext & { hop: HopFacts };
/** A stage after pre-routing: the hop's routing record is this hop's. */
export type RoutedContext = HopContext & { routing: HopRouting };

export function freshRouting(
  packetBeforeHop: InFlightPacket,
  neighbors: Neighbor[],
  forwardCtx: ForwardContext,
): HopRouting {
  return {
    packetBeforeHop,
    packetBeforeForward: null,
    natTranslation: null,
    outsideToInsideMatched: false,
    ingressAclMatch: null,
    egressAclMatch: null,
    neighbors,
    forwardCtx,
    next: null,
    selectedRoute: null,
    nextHopIp: null,
    routerEgressInterface: null,
    arpTarget: null,
    forwardEvent: null,
    resolvedDstMac: null,
    forwardHop: null,
  };
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
    hop: null,
    routing: null,
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
  ctx: HopContext,
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
    ...ctx.hop.base,
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
        : (ctx.routing?.natTranslation ?? null);
  if (natTranslation) {
    dropHop.natTranslation = natTranslation;
  }
  // Before pre-routing the record is the previous hop's (see `LoopContext.routing`),
  // and on the first hop there is none: then, as always, this throws.
  const before = ctx.routing?.packetBeforeHop;
  if (!before) {
    throw new Error('ForwardingLoop stage requires packetBeforeHop');
  }
  const changedFields = ctx.deps.frameMaterializer.diffPacketFields(before, packet);
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
