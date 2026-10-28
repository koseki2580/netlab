import type { FailureState } from '../../../types/failure';
import { isIpv6Packet, type InFlightPacket } from '../../../types/packets';
import type { Neighbor, PacketHop } from '../../../types/simulation';
import type { NetworkTopology } from '../../../types/topology';
import { FlowCollector } from '../../../observability/FlowCollector';
import { NetflowExporter } from '../../../observability/NetflowExporter';
import { SflowSampler } from '../../../observability/SflowSampler';
import type { LinkQueueRegistry } from '../../LinkQueueRegistry';
import { Reassembler } from '../../Reassembler';
import type { ServiceOrchestrator } from '../../ServiceOrchestrator';
import type { TraceRecorder } from '../../TraceRecorder';
import type { PrecomputeOptions } from '../../types';
import type { FrameMaterializer, IcmpBuilder } from '../builders';
import type { InterfaceResolver, MacResolver, PortResolver } from '../resolvers';
import { isPlaceholderMac, type AddressPlane } from '../../AddressPlane';
import type { ArpDispatcher } from './ArpDispatcher';
import { FORWARDING_STAGES, MAX_HOPS, createLoopContext, runStage } from './forwardingStages';

export interface ForwardLoopParams {
  packet: InFlightPacket;
  current: string;
  ingressFrom: string | null;
  ingressEdgeId: string | null;
  senderIp: string | null;
  stepCounter: number;
  baseTs: number;
  visitedStates: Set<string>;
}

export interface ForwardLoopShared {
  hops: PacketHop[];
  snapshots: InFlightPacket[];
  nodeArpTables: Record<string, Record<string, string>>;
  arpCache: Map<string, string>;
  /** What each switch has learned, by switch id: MAC (with VLAN) to port. */
  macTables?: Map<string, Map<string, string>>;
  reassemblers: Map<string, Reassembler>;
  linkQueues: LinkQueueRegistry;
  flowCollector?: FlowCollector;
  netflowExporters?: Map<string, NetflowExporter>;
  sflowSamplers?: Map<string, SflowSampler>;
  failureState: FailureState;
  options: PrecomputeOptions;
}

export class ForwardingLoop {
  constructor(
    private readonly topology: NetworkTopology,
    private readonly traceRecorder: TraceRecorder,
    private readonly services: ServiceOrchestrator,
    private readonly ifaceResolver: InterfaceResolver,
    private readonly macResolver: MacResolver,
    private readonly portResolver: PortResolver,
    private readonly icmpBuilder: IcmpBuilder,
    private readonly frameMaterializer: FrameMaterializer,
    private readonly arpDispatcher: ArpDispatcher,
    private readonly addresses: AddressPlane,
    private readonly getNeighborsFn: (
      currentNodeId: string,
      excludeNodeId: string | null,
      failureState: FailureState,
    ) => Neighbor[],
  ) {}

  seedArpCache(cache: Map<string, string>): void {
    for (const node of this.topology.nodes) {
      for (const iface of this.ifaceResolver.getLogical(node)) {
        if (iface.ipAddress && iface.macAddress && !isPlaceholderMac(iface.macAddress)) {
          cache.set(iface.ipAddress, iface.macAddress);
        }
      }

      const effectiveIp = this.addresses.nodeIp(node);
      if (
        typeof effectiveIp === 'string' &&
        effectiveIp &&
        typeof node.data.mac === 'string' &&
        node.data.mac &&
        !isPlaceholderMac(node.data.mac)
      ) {
        cache.set(effectiveIp, node.data.mac);
      }
    }
  }

  materializePacket(
    packet: InFlightPacket,
    failureState: FailureState,
    arpCache: Map<string, string>,
  ): InFlightPacket {
    const currentNode = this.ifaceResolver.findNode(packet.currentDeviceId);
    const ipPacket = packet.frame.payload;
    let workingPacket: InFlightPacket = {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...ipPacket,
          identification:
            ipPacket.identification ?? this.frameMaterializer.derivePacketIdentification(packet),
        },
      },
    };

    const next =
      currentNode?.data.role === 'client' || currentNode?.data.role === 'server'
        ? (this.getNeighborsFn(packet.currentDeviceId, null, failureState)[0] ?? null)
        : null;

    // A router frames what it sends once its own forwarding decision is made,
    // in the loop; only a host's first frame is filled in here.
    if (currentNode?.data.role === 'client' || currentNode?.data.role === 'server') {
      const resolvedSrcMac = this.macResolver.resolveEndpointMac(currentNode.id);
      const arpTarget =
        next && !isIpv6Packet(workingPacket.frame.payload)
          ? this.arpDispatcher.resolveTargetInfo(
              currentNode.id,
              next.nodeId,
              workingPacket,
              failureState,
              undefined,
              next.edgeId,
              undefined,
            )
          : null;
      const resolvedDstMac = next
        ? arpTarget
          ? (arpCache.get(arpTarget.targetIp) ?? null)
          : this.macResolver.resolveDstMac(
              currentNode.id,
              next.nodeId,
              undefined,
              workingPacket,
              failureState,
            )
        : null;

      workingPacket = {
        ...workingPacket,
        frame: {
          ...workingPacket.frame,
          srcMac:
            resolvedSrcMac && isPlaceholderMac(workingPacket.frame.srcMac)
              ? resolvedSrcMac
              : workingPacket.frame.srcMac,
          dstMac:
            resolvedDstMac && isPlaceholderMac(workingPacket.frame.dstMac)
              ? resolvedDstMac
              : workingPacket.frame.dstMac,
        },
      };
    }

    return this.frameMaterializer.withFrameFcs(
      this.frameMaterializer.withIpv4HeaderChecksum(workingPacket),
    );
  }

  async run(
    params: ForwardLoopParams,
    shared: ForwardLoopShared,
  ): Promise<{ stepCounter: number; generatedIcmpPackets: InFlightPacket[] }> {
    const ctx = createLoopContext(params, shared, {
      topology: this.topology,
      traceRecorder: this.traceRecorder,
      services: this.services,
      ifaceResolver: this.ifaceResolver,
      macResolver: this.macResolver,
      portResolver: this.portResolver,
      icmpBuilder: this.icmpBuilder,
      frameMaterializer: this.frameMaterializer,
      arpDispatcher: this.arpDispatcher,
      addresses: this.addresses,
      getNeighborsFn: this.getNeighborsFn,
      runFragment: (fragmentParams, fragmentShared) => this.run(fragmentParams, fragmentShared),
    });

    hops: for (let iter = 0; iter < MAX_HOPS; iter += 1) {
      // The routing record a hop starts with is the previous hop's; the routed
      // stages run only on the one pre-routing makes for this hop.
      const previousRouting = ctx.routing;
      for (const stage of FORWARDING_STAGES) {
        const routedAt = ctx.routing !== previousRouting ? ctx.routing : null;
        // Only an asynchronous stage is awaited, so the loop yields exactly
        // where it always has.
        const pending = runStage(stage, ctx, routedAt);
        const result = pending instanceof Promise ? await pending : pending;
        if (result.kind === 'break') break hops;
        if (result.kind === 'return') return result.value;
      }
    }

    return { stepCounter: ctx.stepCounter, generatedIcmpPackets: ctx.generatedIcmpPackets };
  }
}
