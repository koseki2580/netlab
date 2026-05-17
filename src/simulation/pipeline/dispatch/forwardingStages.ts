import { layerRegistry } from '../../../registry/LayerRegistry';
import { type FailureState, makeInterfaceFailureId } from '../../../types/failure';
import type { ForwardContext } from '../../../types/layers';
import { IGMP_PROTOCOL } from '../../../types/multicast';
import {
  isIpv6Packet,
  type IgmpMessage,
  type InFlightPacket,
  type IpPacket,
} from '../../../types/packets';
import type { RouteEntry } from '../../../types/routing';
import type {
  NatTranslation,
  Neighbor,
  ObservabilityTrace,
  PacketHop,
} from '../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { FlowCollector } from '../../../observability/FlowCollector';
import { NetflowExporter } from '../../../observability/NetflowExporter';
import { SflowSampler } from '../../../observability/SflowSampler';
import { effectiveMtu, fragment, packetSizeBytes } from '../../fragmentation';
import type { LinkQueueRegistry } from '../../LinkQueueRegistry';
import { Reassembler } from '../../Reassembler';
import type { ServiceOrchestrator } from '../../ServiceOrchestrator';
import type { TraceRecorder } from '../../TraceRecorder';
import type { FrameMaterializer, IcmpBuilder } from '../builders';
import type { InterfaceResolver, MacResolver, PortResolver, ResolvedInterface } from '../resolvers';
import type { ArpDispatcher } from './ArpDispatcher';
import type { ForwardLoopParams, ForwardLoopShared } from './ForwardingLoop';
import { buildRoutingDecision, isPortBearingPayload, protocolName } from './routingHelpers';
import type { AclMatchInfo } from '../../../types/acl';

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

function continueWith(ctx: LoopContext): StageResult {
  return { kind: 'continue', ctx };
}

function breakWith(ctx: LoopContext): StageResult {
  return { kind: 'break', stepCounter: ctx.stepCounter };
}

function appendHop(ctx: LoopContext, hop: Omit<PacketHop, 'step'>, packet: InFlightPacket): void {
  ctx.stepCounter = ctx.deps.traceRecorder.appendHop(
    ctx.shared.hops,
    ctx.shared.snapshots,
    ctx.deps.frameMaterializer.withPacketMacs(hop, packet),
    packet,
    ctx.stepCounter,
  );
}

function requireNode(ctx: LoopContext): NetlabNode {
  if (!ctx.node) {
    throw new Error('ForwardingLoop stage requires node context');
  }
  return ctx.node;
}

function requireHopBase(ctx: LoopContext): Omit<PacketHop, 'step'> {
  if (!ctx.hopBase) {
    throw new Error('ForwardingLoop stage requires hop base');
  }
  return ctx.hopBase;
}

function requirePacketBeforeHop(ctx: LoopContext): InFlightPacket {
  if (!ctx.packetBeforeHop) {
    throw new Error('ForwardingLoop stage requires packetBeforeHop');
  }
  return ctx.packetBeforeHop;
}

function buildLoopGuardKey(
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

export function runPreflightStage(ctx: LoopContext): StageResult {
  const node = ctx.deps.ifaceResolver.findNode(ctx.current);
  if (!node) {
    appendHop(
      ctx,
      {
        nodeId: ctx.current,
        nodeLabel: ctx.current,
        srcIp: ctx.workingPacket.frame.payload.srcIp,
        dstIp: ctx.workingPacket.frame.payload.dstIp,
        ttl: ctx.workingPacket.frame.payload.ttl,
        protocol: protocolName(ctx.workingPacket.frame.payload.protocol),
        event: 'drop',
        ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
        reason: 'node-not-found',
        timestamp: ctx.baseTs,
      },
      ctx.workingPacket,
    );
    return breakWith(ctx);
  }

  const loopGuardKey = buildLoopGuardKey(ctx, node, ctx.workingPacket, ctx.ingressEdgeId);
  if (ctx.visitedStates.has(loopGuardKey)) {
    appendHop(
      ctx,
      {
        nodeId: ctx.current,
        nodeLabel: node.data.label,
        srcIp: ctx.workingPacket.frame.payload.srcIp,
        dstIp: ctx.workingPacket.frame.payload.dstIp,
        ttl: ctx.workingPacket.frame.payload.ttl,
        protocol: protocolName(ctx.workingPacket.frame.payload.protocol),
        event: 'drop',
        ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
        reason: 'routing-loop',
        timestamp: ctx.baseTs,
      },
      ctx.workingPacket,
    );
    return breakWith(ctx);
  }
  ctx.visitedStates.add(loopGuardKey);

  if (ctx.shared.failureState.downNodeIds.has(ctx.current)) {
    appendHop(
      ctx,
      {
        nodeId: ctx.current,
        nodeLabel: node.data.label,
        srcIp: ctx.workingPacket.frame.payload.srcIp,
        dstIp: ctx.workingPacket.frame.payload.dstIp,
        ttl: ctx.workingPacket.frame.payload.ttl,
        protocol: protocolName(ctx.workingPacket.frame.payload.protocol),
        event: 'drop',
        ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
        reason: 'node-down',
        timestamp: ctx.baseTs,
      },
      ctx.workingPacket,
    );
    return breakWith(ctx);
  }

  const ipPacket = ctx.workingPacket.frame.payload;
  const transport = ipPacket.payload;
  ctx.node = node;
  ctx.ipPacket = ipPacket;
  ctx.transport = transport;
  ctx.hopBase = {
    nodeId: ctx.current,
    nodeLabel: node.data.label,
    srcIp: ipPacket.srcIp,
    dstIp: ipPacket.dstIp,
    ttl: ipPacket.ttl,
    protocol: protocolName(ipPacket.protocol),
    ...(isPortBearingPayload(transport)
      ? { srcPort: transport.srcPort, dstPort: transport.dstPort }
      : {}),
    ...(isIgmpMessage(transport)
      ? {
          action:
            transport.groupAddress !== '0.0.0.0'
              ? (`IGMP ${transport.igmpType} group=${transport.groupAddress}` as const)
              : (`IGMP ${transport.igmpType}` as const),
        }
      : {}),
    event: 'forward',
    ...(ctx.ingressFrom !== null ? { fromNodeId: ctx.ingressFrom } : {}),
    timestamp: ctx.baseTs,
  };

  return continueWith(ctx);
}

export function runDeliverToSelfStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const ipPacket = ctx.ipPacket ?? ctx.workingPacket.frame.payload;

  if (
    ipPacket.dstIp === BROADCAST_IP &&
    ctx.workingPacket.dstNodeId === ctx.current &&
    (node.data.dhcpServer != null || node.data.dhcpClient != null)
  ) {
    appendHop(ctx, { ...hopBase, event: 'deliver' }, ctx.workingPacket);
    return breakWith(ctx);
  }

  if (
    ctx.workingPacket.dstNodeId === ctx.current &&
    node.data.role !== 'switch' &&
    ctx.deps.macResolver.nodeOwnsIp(node, ipPacket.dstIp)
  ) {
    const isFragmentedPacket =
      ipPacket.identification !== undefined &&
      (ipPacket.flags?.mf === true || (ipPacket.fragmentOffset ?? 0) > 0);

    if (isFragmentedPacket) {
      const reassembler = ctx.shared.reassemblers.get(ctx.current) ?? new Reassembler();
      ctx.shared.reassemblers.set(ctx.current, reassembler);
      const reassembledPacket = reassembler.accept(ipPacket);

      if (!reassembledPacket) {
        appendHop(
          ctx,
          { ...hopBase, event: 'deliver', action: 'reassembly-pending' },
          ctx.workingPacket,
        );
        return breakWith(ctx);
      }

      const deliveredPacket = ctx.deps.frameMaterializer.withFrameFcs(
        ctx.deps.frameMaterializer.withIpv4HeaderChecksum({
          ...ctx.workingPacket,
          frame: {
            ...ctx.workingPacket.frame,
            payload: reassembledPacket,
          },
        }),
      );
      const fragmentCount = reassembler.getLastCompletedFragmentCount();
      appendHop(
        ctx,
        {
          ...hopBase,
          event: 'deliver',
          action: 'reassembly-complete',
          ...(fragmentCount != null ? { fragmentCount } : {}),
        },
        deliveredPacket,
      );
      return breakWith(ctx);
    }

    appendHop(ctx, { ...hopBase, event: 'deliver' }, ctx.workingPacket);
    return breakWith(ctx);
  }

  return continueWith(ctx);
}

export function runIngressInterfaceStage(ctx: LoopContext): StageResult {
  const hopBase = requireHopBase(ctx);
  if (ctx.ingressFrom !== null) {
    const ingressInterface =
      (ctx.senderIp ? ctx.deps.ifaceResolver.resolveIngress(ctx.current, ctx.senderIp) : null) ??
      ctx.deps.portResolver.resolvePortFromEdge(ctx.current, ctx.ingressEdgeId ?? '', 'ingress');
    if (ingressInterface) {
      hopBase.ingressInterfaceId = ingressInterface.id;
      hopBase.ingressInterfaceName = ingressInterface.name;
    }
  }

  return continueWith(ctx);
}

export function runRouterPreRoutingStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const ipPacket = ctx.ipPacket ?? ctx.workingPacket.frame.payload;
  const transport = ctx.transport ?? ipPacket.payload;

  ctx.packetBeforeHop = ctx.workingPacket;
  ctx.packetBeforeForward = null;
  ctx.natTranslation = null;
  ctx.outsideToInsideMatched = false;
  ctx.ingressAclMatch = null;
  ctx.egressAclMatch = null;
  ctx.next = null;
  ctx.selectedRoute = null;
  ctx.routerEgressInterface = null;
  ctx.arpTarget = null;
  ctx.forwardEvent = null;
  ctx.resolvedDstMac = null;
  ctx.forwardHop = null;
  ctx.neighbors = ctx.deps.getNeighborsFn(
    ctx.current,
    node.data.role === 'router' ? null : ctx.ingressFrom,
    ctx.shared.failureState,
  );
  const multicastTable =
    node.data.role === 'switch' ? ctx.deps.services.getMulticastTable(ctx.current) : null;
  ctx.forwardCtx = {
    neighbors: ctx.neighbors,
    ...(multicastTable != null ? { multicastTable } : {}),
  };

  if (node.data.role !== 'router') {
    return continueWith(ctx);
  }

  const natProcessor = ctx.deps.services.getNatProcessor(ctx.current);
  if (natProcessor) {
    const preRoutingResult = natProcessor.applyPreRouting(
      ctx.workingPacket,
      hopBase.ingressInterfaceId,
      ctx.stepCounter,
    );
    if (preRoutingResult.dropReason) {
      appendDropHop(
        ctx,
        preRoutingResult.dropReason,
        preRoutingResult.packet,
        {},
        {
          natTranslation: preRoutingResult.translation,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = preRoutingResult.packet;
    ctx.natTranslation = preRoutingResult.translation;
    ctx.outsideToInsideMatched = preRoutingResult.matched;
  }

  const aclProcessor = ctx.deps.services.getAclProcessor(ctx.current);
  if (aclProcessor) {
    const ingressResult = aclProcessor.applyIngress(
      ctx.workingPacket,
      hopBase.ingressInterfaceId,
      ctx.stepCounter,
    );
    ctx.ingressAclMatch = ingressResult.match;
    if (ingressResult.dropReason) {
      appendDropHop(
        ctx,
        ingressResult.dropReason,
        ingressResult.packet,
        {},
        {
          aclMatch: ingressResult.match,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = ingressResult.packet;
  }

  if (ipPacket.protocol === IGMP_PROTOCOL && isIgmpMessage(transport)) {
    const igmpProcessor = ctx.deps.services.getIgmpProcessor(ctx.current);
    if (igmpProcessor) {
      const ifaceId = hopBase.ingressInterfaceId ?? ctx.current;
      if (transport.igmpType === 'v2-membership-report') {
        igmpProcessor.recordReport(ifaceId, transport.groupAddress);
      } else if (transport.igmpType === 'v2-leave-group') {
        igmpProcessor.recordLeave(ifaceId, transport.groupAddress);
      }
    }
  }

  return continueWith(ctx);
}

export async function runForwarderDispatchStage(ctx: LoopContext): Promise<StageResult> {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);

  if (node.data.role === 'router' || node.data.role === 'switch') {
    const forwarderFactory = layerRegistry.getForwarder(node.data.layerId);
    if (forwarderFactory) {
      const forwarder = forwarderFactory(ctx.current, ctx.deps.topology);
      const decision = await forwarder.receive(
        ctx.workingPacket,
        ctx.workingPacket.ingressPortId ?? '',
        ctx.forwardCtx ?? { neighbors: ctx.neighbors },
      );
      if (decision.action === 'drop') {
        const extras: Partial<Omit<PacketHop, 'step' | 'event' | 'reason'>> = {};
        if (node.data.role === 'router' && decision.reason !== 'ttl-exceeded') {
          const routes = ctx.deps.topology.routeTables.get(ctx.current) ?? [];
          extras.routingDecision = buildRoutingDecision(
            ctx.workingPacket.frame.payload.dstIp,
            routes,
            null,
          );
        }
        if (
          node.data.role === 'router' &&
          decision.reason === 'ttl-exceeded' &&
          !ctx.shared.options.suppressGeneratedIcmp
        ) {
          const routerIp = hopBase.ingressInterfaceId
            ? ctx.deps.ifaceResolver.findLogicalById(ctx.current, hopBase.ingressInterfaceId)
                ?.ipAddress
            : undefined;
          const responseSourceIp = routerIp ?? ctx.deps.getEffectiveNodeIp(node);
          if (
            responseSourceIp &&
            ctx.deps.icmpBuilder.shouldEmitGeneratedIcmp(ctx.workingPacket.frame.payload.srcIp)
          ) {
            extras.icmpGenerated = true;
            ctx.generatedIcmpPackets.push(
              ctx.deps.icmpBuilder.buildTimeExceeded(
                ctx.current,
                responseSourceIp,
                ctx.workingPacket,
              ),
            );
          }
        }
        appendDropHop(ctx, decision.reason, ctx.workingPacket, extras, {
          aclMatch: ctx.ingressAclMatch,
        });
        return breakWith(ctx);
      }

      if (decision.action !== 'forward') {
        const deliverHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: 'deliver',
          ...(ctx.ingressAclMatch != null ? { aclMatch: ctx.ingressAclMatch } : {}),
        };
        if (ctx.natTranslation) {
          deliverHop.natTranslation = ctx.natTranslation;
        }
        const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
          requirePacketBeforeHop(ctx),
          decision.packet,
        );
        if (changedFields.length > 0) {
          deliverHop.changedFields = changedFields;
        }
        appendHop(ctx, deliverHop, decision.packet);
        return breakWith(ctx);
      }

      ctx.workingPacket = decision.packet;
      ctx.next = { nodeId: decision.nextNodeId, edgeId: decision.edgeId };

      if (node.data.role === 'router') {
        ctx.selectedRoute = decision.selectedRoute ?? null;
        if (decision.ecmpTrace) {
          hopBase.action = 'ecmp:bucketed';
          hopBase.ecmpTrace = decision.ecmpTrace;
        }
        const ingressInterfaceMatch = ctx.deps.ifaceResolver.findLogicalById(
          ctx.current,
          decision.ingressInterfaceId,
        );
        if (ingressInterfaceMatch) {
          hopBase.ingressInterfaceId = ingressInterfaceMatch.id;
          hopBase.ingressInterfaceName = ingressInterfaceMatch.name;
        }
        const egressInterfaceId = decision.egressInterfaceId;
        const interfaceMatch = ctx.deps.ifaceResolver.findLogicalById(
          ctx.current,
          egressInterfaceId,
        );
        ctx.routerEgressInterface = interfaceMatch
          ? { id: interfaceMatch.id, name: interfaceMatch.name }
          : ctx.deps.portResolver.resolvePortFromEdge(ctx.current, ctx.next.edgeId, 'egress');
      }
    }
  } else if (ctx.ingressFrom === null) {
    ctx.next = ctx.neighbors[0] ?? null;
  }

  if (node.data.role === 'router') {
    const routes = ctx.deps.topology.routeTables.get(ctx.current) ?? [];
    hopBase.routingDecision = buildRoutingDecision(
      ctx.workingPacket.frame.payload.dstIp,
      routes,
      ctx.selectedRoute,
    );
  }

  if (!ctx.next) {
    appendDropHop(ctx, 'no-route', ctx.workingPacket, {}, { aclMatch: ctx.ingressAclMatch });
    return breakWith(ctx);
  }

  return continueWith(ctx);
}

export function runRouterPostRoutingStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);

  if (node.data.role !== 'router') {
    return continueWith(ctx);
  }

  if (ctx.routerEgressInterface) {
    hopBase.egressInterfaceId = ctx.routerEgressInterface.id;
    hopBase.egressInterfaceName = ctx.routerEgressInterface.name;
  }

  if (
    ctx.routerEgressInterface &&
    ctx.shared.failureState.downInterfaceIds.has(
      makeInterfaceFailureId(ctx.current, ctx.routerEgressInterface.id),
    )
  ) {
    appendDropHop(ctx, 'interface-down', ctx.workingPacket, {}, { aclMatch: ctx.ingressAclMatch });
    return breakWith(ctx);
  }

  const aclProcessor = ctx.deps.services.getAclProcessor(ctx.current);
  if (aclProcessor) {
    const egressResult = aclProcessor.applyEgress(
      ctx.workingPacket,
      hopBase.egressInterfaceId,
      ctx.stepCounter,
    );
    ctx.egressAclMatch = egressResult.match;
    if (egressResult.dropReason) {
      appendDropHop(
        ctx,
        egressResult.dropReason,
        egressResult.packet,
        {},
        {
          aclMatch: egressResult.match,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = egressResult.packet;
  }

  const natProcessor = ctx.deps.services.getNatProcessor(ctx.current);
  if (natProcessor) {
    const postRoutingResult = natProcessor.applyPostRouting(
      ctx.workingPacket,
      hopBase.ingressInterfaceId,
      hopBase.egressInterfaceId,
      ctx.stepCounter,
      ctx.outsideToInsideMatched,
    );
    if (postRoutingResult.dropReason) {
      appendDropHop(
        ctx,
        postRoutingResult.dropReason,
        postRoutingResult.packet,
        {},
        {
          aclMatch: ctx.egressAclMatch ?? ctx.ingressAclMatch,
          natTranslation: postRoutingResult.translation ?? ctx.natTranslation,
        },
      );
      return breakWith(ctx);
    }

    ctx.workingPacket = postRoutingResult.packet;
    ctx.natTranslation = postRoutingResult.translation ?? ctx.natTranslation;
  }

  return continueWith(ctx);
}

export function runArpInjectionStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const next = ctx.next;
  if (!next) {
    return continueWith(ctx);
  }

  ctx.arpTarget =
    !isIpv6Packet(ctx.workingPacket.frame.payload) &&
    (node.data.role === 'router' || node.data.role === 'client' || node.data.role === 'server')
      ? ctx.deps.arpDispatcher.resolveTargetInfo(
          ctx.current,
          next.nodeId,
          ctx.workingPacket,
          ctx.shared.failureState,
          ctx.routerEgressInterface?.id,
          next.edgeId,
          ctx.selectedRoute?.nextHop,
        )
      : null;
  const shouldInjectArp =
    ctx.arpTarget !== null && !ctx.shared.arpCache.has(ctx.arpTarget.targetIp);

  if (shouldInjectArp && ctx.ingressFrom === null) {
    const createHop: Omit<PacketHop, 'step'> = {
      ...hopBase,
      event: 'create',
      toNodeId: next.nodeId,
      activeEdgeId: next.edgeId,
    };
    const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
      requirePacketBeforeHop(ctx),
      ctx.workingPacket,
    );
    if (changedFields.length > 0) {
      createHop.changedFields = changedFields;
    }
    appendHop(ctx, createHop, ctx.workingPacket);
  }

  ctx.packetBeforeForward =
    shouldInjectArp && ctx.ingressFrom === null ? ctx.workingPacket : requirePacketBeforeHop(ctx);

  if (shouldInjectArp && ctx.arpTarget) {
    const targetMac = ctx.deps.arpDispatcher.resolveTargetMac(
      ctx.current,
      next.nodeId,
      ctx.arpTarget.targetNodeId,
      ctx.workingPacket,
      ctx.shared.failureState,
      hopBase.egressInterfaceId,
      ctx.selectedRoute?.nextHop,
    );

    ctx.stepCounter = ctx.deps.arpDispatcher.injectExchange(
      ctx.current,
      ctx.arpTarget.targetNodeId,
      ctx.arpTarget.senderIp,
      ctx.arpTarget.targetIp,
      ctx.arpTarget.senderMac,
      targetMac,
      next.edgeId,
      ctx.workingPacket,
      ctx.stepCounter,
      ctx.shared.hops,
      ctx.shared.snapshots,
      ctx.baseTs,
    );

    ctx.shared.arpCache.set(ctx.arpTarget.targetIp, targetMac);
    if (ctx.arpTarget.senderIp.trim()) {
      ctx.shared.arpCache.set(ctx.arpTarget.senderIp, ctx.arpTarget.senderMac);
    }
    recordArpEntry(ctx, ctx.current, ctx.arpTarget.targetIp, targetMac);
    recordArpEntry(
      ctx,
      ctx.arpTarget.targetNodeId,
      ctx.arpTarget.senderIp,
      ctx.arpTarget.senderMac,
    );
  }

  ctx.forwardEvent = ctx.ingressFrom === null && !shouldInjectArp ? 'create' : 'forward';
  ctx.resolvedDstMac = ctx.arpTarget
    ? (ctx.shared.arpCache.get(ctx.arpTarget.targetIp) ??
      ctx.deps.arpDispatcher.resolveTargetMac(
        ctx.current,
        next.nodeId,
        ctx.arpTarget.targetNodeId,
        ctx.workingPacket,
        ctx.shared.failureState,
        hopBase.egressInterfaceId,
        ctx.selectedRoute?.nextHop,
      ))
    : ctx.deps.macResolver.resolveDstMac(
        ctx.current,
        next.nodeId,
        hopBase.egressInterfaceId,
        ctx.workingPacket,
        ctx.shared.failureState,
        ctx.selectedRoute?.nextHop,
      );

  return continueWith(ctx);
}

export async function runEgressFramingAndFragmentationStage(
  ctx: LoopContext,
): Promise<StageResult> {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const next = ctx.next;
  if (!next) {
    return continueWith(ctx);
  }

  if (node.data.role === 'router') {
    const egressIface = ctx.deps.ifaceResolver.findLogicalById(
      ctx.current,
      hopBase.egressInterfaceId,
    );
    const egressEdge = ctx.deps.topology.edges.find((candidate) => candidate.id === next.edgeId);
    const mtu = effectiveMtu(egressEdge?.data?.mtuBytes, egressIface?.mtu);
    const size = packetSizeBytes(ctx.workingPacket.frame.payload);

    if (size > mtu && ctx.workingPacket.frame.payload.flags?.df === true) {
      const extras: Partial<Omit<PacketHop, 'step' | 'event' | 'reason'>> = { nextHopMtu: mtu };
      const routerIp = hopBase.ingressInterfaceId
        ? ctx.deps.ifaceResolver.findLogicalById(ctx.current, hopBase.ingressInterfaceId)?.ipAddress
        : ctx.deps.getEffectiveNodeIp(node);
      if (
        routerIp &&
        !ctx.shared.options.suppressGeneratedIcmp &&
        ctx.deps.icmpBuilder.shouldEmitGeneratedIcmp(ctx.workingPacket.frame.payload.srcIp)
      ) {
        extras.icmpGenerated = true;
        ctx.generatedIcmpPackets.push(
          ctx.deps.icmpBuilder.buildFragmentationNeeded(
            ctx.current,
            routerIp,
            ctx.workingPacket,
            mtu,
          ),
        );
      }
      appendDropHop(ctx, 'fragmentation-needed', ctx.workingPacket, extras, {
        aclMatch: ctx.egressAclMatch ?? ctx.ingressAclMatch,
      });
      return breakWith(ctx);
    }

    if (size > mtu) {
      const identification =
        ctx.workingPacket.frame.payload.identification ??
        ctx.deps.frameMaterializer.derivePacketIdentification(ctx.workingPacket);
      const fragments = fragment(ctx.workingPacket.frame.payload, mtu, identification);
      const nextIngressPort = ctx.deps.portResolver.resolvePortFromEdge(
        next.nodeId,
        next.edgeId,
        'ingress',
      );
      const fragmentAclMatch = ctx.egressAclMatch ?? ctx.ingressAclMatch ?? undefined;
      ctx.senderIp = egressIface?.ipAddress ?? null;

      for (const [fragmentIndex, fragmentPayload] of fragments.entries()) {
        let fragmentPacket: InFlightPacket = {
          ...ctx.workingPacket,
          frame: {
            ...ctx.workingPacket.frame,
            payload: fragmentPayload,
            srcMac: egressIface?.macAddress ?? ctx.workingPacket.frame.srcMac,
            dstMac: ctx.resolvedDstMac ?? ctx.workingPacket.frame.dstMac,
          },
        };
        fragmentPacket = ctx.deps.frameMaterializer.withFrameFcs(
          ctx.deps.frameMaterializer.withIpv4HeaderChecksum(fragmentPacket),
        );

        const fragmentHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: ctx.forwardEvent ?? 'forward',
          toNodeId: next.nodeId,
          activeEdgeId: next.edgeId,
          action: 'fragment',
          fragmentIndex,
          fragmentCount: fragments.length,
          identification,
          nextHopMtu: mtu,
        };
        if (ctx.natTranslation) {
          fragmentHop.natTranslation = ctx.natTranslation;
        }
        if (fragmentAclMatch) {
          fragmentHop.aclMatch = fragmentAclMatch;
        }
        const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
          ctx.packetBeforeForward ?? requirePacketBeforeHop(ctx),
          fragmentPacket,
        );
        if (changedFields.length > 0) {
          fragmentHop.changedFields = changedFields;
        }
        appendHop(ctx, fragmentHop, fragmentPacket);

        const forwardedFragment: InFlightPacket = {
          ...fragmentPacket,
          currentDeviceId: next.nodeId,
          ingressPortId: nextIngressPort?.id ?? fragmentPacket.ingressPortId,
        };
        const fragmentResult = await ctx.deps.runFragment(
          {
            packet: forwardedFragment,
            current: next.nodeId,
            ingressFrom: ctx.current,
            ingressEdgeId: next.edgeId,
            senderIp: ctx.senderIp,
            stepCounter: ctx.stepCounter,
            baseTs: ctx.baseTs,
            visitedStates: new Set(ctx.visitedStates),
          },
          ctx.shared,
        );
        ctx.stepCounter = fragmentResult.stepCounter;
        ctx.generatedIcmpPackets.push(...fragmentResult.generatedIcmpPackets);
      }

      return {
        kind: 'return',
        value: { stepCounter: ctx.stepCounter, generatedIcmpPackets: ctx.generatedIcmpPackets },
      };
    }

    ctx.senderIp = egressIface?.ipAddress ?? null;
    ctx.workingPacket = ctx.deps.frameMaterializer.withFrameFcs({
      ...ctx.workingPacket,
      frame: {
        ...ctx.workingPacket.frame,
        srcMac: egressIface?.macAddress ?? ctx.workingPacket.frame.srcMac,
        dstMac: ctx.resolvedDstMac ?? ctx.workingPacket.frame.dstMac,
      },
    });
  } else if (node.data.role === 'client' || node.data.role === 'server') {
    ctx.senderIp = ctx.deps.getEffectiveNodeIp(node) ?? null;
    const resolvedSrcMac = ctx.deps.macResolver.resolveEndpointMac(ctx.current);
    ctx.workingPacket = ctx.deps.frameMaterializer.withFrameFcs({
      ...ctx.workingPacket,
      frame: {
        ...ctx.workingPacket.frame,
        srcMac:
          resolvedSrcMac && ctx.deps.macResolver.isPlaceholderMac(ctx.workingPacket.frame.srcMac)
            ? resolvedSrcMac
            : ctx.workingPacket.frame.srcMac,
        dstMac:
          ctx.resolvedDstMac &&
          ctx.deps.macResolver.isPlaceholderMac(ctx.workingPacket.frame.dstMac)
            ? ctx.resolvedDstMac
            : ctx.workingPacket.frame.dstMac,
      },
    });
  } else if (node.data.role === 'switch') {
    const egressPort = ctx.deps.portResolver.resolvePortFromEdge(
      ctx.current,
      next.edgeId,
      'egress',
    );
    if (egressPort) {
      hopBase.egressInterfaceId = egressPort.id;
      hopBase.egressInterfaceName = egressPort.name;
    }
  }

  return continueWith(ctx);
}

export function runObservabilityStage(ctx: LoopContext): StageResult {
  const node = requireNode(ctx);
  const hopBase = requireHopBase(ctx);
  const next = ctx.next;
  if (!next) {
    return continueWith(ctx);
  }

  const forwardHop: Omit<PacketHop, 'step'> = {
    ...hopBase,
    event: ctx.forwardEvent ?? 'forward',
    toNodeId: next.nodeId,
    activeEdgeId: next.edgeId,
  };
  if (ctx.natTranslation) {
    forwardHop.natTranslation = ctx.natTranslation;
  }
  const forwardAclMatch = ctx.egressAclMatch ?? ctx.ingressAclMatch;
  if (forwardAclMatch != null) {
    forwardHop.aclMatch = forwardAclMatch;
  }
  const changedFields = ctx.deps.frameMaterializer.diffPacketFields(
    ctx.packetBeforeForward ?? requirePacketBeforeHop(ctx),
    ctx.workingPacket,
  );
  if (changedFields.length > 0) {
    forwardHop.changedFields = changedFields;
  }
  ctx.forwardHop = forwardHop;

  if (node.data.role === 'router' && node.data.netflow?.enabled) {
    const exporter =
      ctx.netflowExporters.get(ctx.current) ??
      new NetflowExporter(ctx.current, node.data.netflow, ctx.flowCollector);
    ctx.netflowExporters.set(ctx.current, exporter);
    const update = exporter.observe(
      ctx.workingPacket,
      hopBase.ingressInterfaceId ?? 'unknown',
      hopBase.egressInterfaceId ?? 'unknown',
      ctx.stepCounter,
    );
    if (update) {
      ctx.stepCounter = ctx.deps.appendObservabilityTrace(
        forwardHop,
        {
          kind: 'netflow:flow-update',
          routerId: update.routerId,
          flowKey: update.flowKey,
          packets: update.packets ?? 0,
          bytes: update.bytes ?? 0,
        },
        ctx.workingPacket,
        ctx.stepCounter,
        ctx.shared.hops,
        ctx.shared.snapshots,
      );
    }
  }

  if (node.data.role === 'switch' && node.data.sflow?.enabled) {
    const egressPortId = hopBase.egressInterfaceId ?? 'unknown';
    const port = (node.data.ports ?? []).find((candidate) => candidate.id === egressPortId);
    if (port?.sflowEnabled !== false) {
      const sampler =
        ctx.sflowSamplers.get(ctx.current) ??
        new SflowSampler(ctx.current, node.data.sflow, ctx.flowCollector);
      ctx.sflowSamplers.set(ctx.current, sampler);
      const update = sampler.observe(
        ctx.workingPacket.frame,
        ctx.workingPacket.ingressPortId || 'unknown',
        egressPortId,
        ctx.stepCounter,
      );
      if (update) {
        ctx.stepCounter = ctx.deps.appendObservabilityTrace(
          forwardHop,
          update.action === 'sflow:sampled'
            ? {
                kind: 'sflow:sampled',
                switchId: update.switchId,
                portId: update.portId,
                sequence: update.sequence,
              }
            : {
                kind: 'sflow:dropped',
                switchId: update.switchId,
                portId: update.portId,
                reason: update.reason,
              },
          ctx.workingPacket,
          ctx.stepCounter,
          ctx.shared.hops,
          ctx.shared.snapshots,
        );
      }
    }
  }

  return continueWith(ctx);
}

export function runLinkQosStage(ctx: LoopContext): StageResult {
  const next = ctx.next;
  if (!next || !ctx.forwardHop) {
    return continueWith(ctx);
  }

  const qosResult = ctx.deps.appendLinkQosTrace(
    ctx.forwardHop,
    ctx.workingPacket,
    next.edgeId,
    ctx.stepCounter,
    ctx.shared.hops,
    ctx.shared.snapshots,
    ctx.shared.failureState,
    ctx.shared.linkQueues,
  );
  ctx.stepCounter = qosResult.stepCounter;
  if (qosResult.dropped) {
    return breakWith(ctx);
  }

  return continueWith(ctx);
}

export function runForwardCommitStage(ctx: LoopContext): StageResult {
  const next = ctx.next;
  if (!next || !ctx.forwardHop) {
    return continueWith(ctx);
  }

  appendHop(ctx, ctx.forwardHop, ctx.workingPacket);

  ctx.ingressFrom = ctx.current;
  ctx.ingressEdgeId = next.edgeId;
  const nextIngressPort = ctx.deps.portResolver.resolvePortFromEdge(
    next.nodeId,
    next.edgeId,
    'ingress',
  );
  ctx.workingPacket = {
    ...ctx.workingPacket,
    currentDeviceId: next.nodeId,
    ingressPortId: nextIngressPort?.id ?? ctx.workingPacket.ingressPortId,
  };
  ctx.current = next.nodeId;

  return continueWith(ctx);
}

function recordArpEntry(ctx: LoopContext, nodeId: string, ip: string, mac: string): void {
  if (!ip.trim() || !mac.trim()) return;
  ctx.shared.nodeArpTables[nodeId] ??= {};
  ctx.shared.nodeArpTables[nodeId][ip] = mac;
}
