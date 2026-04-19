import type { FailureState } from '../../../types/failure';
import type { InFlightPacket } from '../../../types/packets';
import type { PacketHop } from '../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { isInSubnet } from '../../../utils/cidr';
import { deriveDeterministicMac } from '../../../utils/network';
import type { TraceRecorder } from '../../TraceRecorder';
import type { ArpBuilder, FrameMaterializer } from '../builders';
import type { InterfaceResolver, MacResolver, PortResolver } from '../resolvers';
import { bestRoute } from './routingHelpers';

const BROADCAST_IP = '255.255.255.255';

export interface ArpTargetInfo {
  targetIp: string;
  targetNodeId: string;
  senderIp: string;
  senderMac: string;
}

export class ArpDispatcher {
  constructor(
    private readonly topology: NetworkTopology,
    private readonly traceRecorder: TraceRecorder,
    private readonly ifaceResolver: InterfaceResolver,
    private readonly macResolver: MacResolver,
    private readonly portResolver: PortResolver,
    private readonly arpBuilder: ArpBuilder,
    private readonly frameMaterializer: FrameMaterializer,
    private readonly getEffectiveNodeIp: (node: NetlabNode | null) => string | undefined,
  ) {}

  resolveTargetInfo(
    currentNodeId: string,
    nextNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    egressInterfaceId?: string,
    edgeId?: string,
    overrideNextHop?: string,
  ): ArpTargetInfo | null {
    const currentNode = this.ifaceResolver.findNode(currentNodeId);
    if (!currentNode) return null;
    if (packet.frame.payload.dstIp === BROADCAST_IP) return null;

    if (currentNode.data.role === 'router') {
      let targetIp: string | null;
      if (overrideNextHop !== undefined) {
        targetIp = overrideNextHop === 'direct' ? packet.frame.payload.dstIp : overrideNextHop;
      } else {
        const routes = this.topology.routeTables.get(currentNodeId) ?? [];
        const route = bestRoute(packet.frame.payload.dstIp, routes);
        if (!route) return null;
        targetIp = route.nextHop === 'direct' ? packet.frame.payload.dstIp : route.nextHop;
      }

      if (!targetIp) return null;

      const targetNode = this.macResolver.resolveEffectiveLayer2Destination(
        currentNodeId,
        nextNodeId,
        packet,
        failureState,
        overrideNextHop,
      );
      if (!targetNode || !this.macResolver.nodeOwnsIp(targetNode, targetIp)) return null;

      const egressInterface =
        this.ifaceResolver.findLogicalById(currentNodeId, egressInterfaceId) ??
        (() => {
          const fallback = this.portResolver.resolvePortFromEdge(
            currentNodeId,
            edgeId ?? '',
            'egress',
          );
          return this.ifaceResolver.findLogicalById(currentNodeId, fallback?.id);
        })();

      return {
        targetIp,
        targetNodeId: targetNode.id,
        senderIp: egressInterface?.ipAddress ?? '',
        senderMac: egressInterface?.macAddress ?? deriveDeterministicMac(currentNodeId),
      };
    }

    if (currentNode.data.role !== 'client' && currentNode.data.role !== 'server') {
      return null;
    }

    const targetNode = this.macResolver.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
      overrideNextHop,
    );
    if (!targetNode) return null;

    const senderIp = this.getEffectiveNodeIp(currentNode) ?? '';
    let targetIp = '';

    if (targetNode.data.role === 'router') {
      const gatewayInterface = this.ifaceResolver
        .getLogical(targetNode)
        .find(
          (iface) =>
            senderIp.length > 0 && isInSubnet(senderIp, `${iface.ipAddress}/${iface.prefixLength}`),
        );
      targetIp = gatewayInterface?.ipAddress ?? '';
    } else if (targetNode.data.role === 'client' || targetNode.data.role === 'server') {
      targetIp = this.getEffectiveNodeIp(targetNode) ?? '';
    }

    if (!targetIp || !this.macResolver.nodeOwnsIp(targetNode, targetIp)) return null;

    return {
      targetIp,
      targetNodeId: targetNode.id,
      senderIp,
      senderMac:
        this.macResolver.resolveEndpointMac(currentNodeId) ?? deriveDeterministicMac(currentNodeId),
    };
  }

  resolveTargetMac(
    currentNodeId: string,
    nextNodeId: string,
    targetNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    egressInterfaceId?: string,
    overrideNextHop?: string,
  ): string {
    const resolvedMac = this.macResolver.resolveDstMac(
      currentNodeId,
      nextNodeId,
      egressInterfaceId,
      packet,
      failureState,
      overrideNextHop,
    );
    if (resolvedMac) return resolvedMac;

    const targetNode = this.ifaceResolver.findNode(targetNodeId);
    if (targetNode?.data.role === 'router') {
      return (
        this.macResolver.resolveRouterMac(
          currentNodeId,
          targetNodeId,
          packet,
          egressInterfaceId,
          overrideNextHop,
        ) ?? deriveDeterministicMac(targetNodeId)
      );
    }

    return (
      this.macResolver.resolveEndpointMac(targetNodeId) ?? deriveDeterministicMac(targetNodeId)
    );
  }

  injectExchange(
    senderNodeId: string,
    targetNodeId: string,
    senderIp: string,
    targetIp: string,
    senderMac: string,
    targetMac: string,
    edgeId: string,
    workingPacket: InFlightPacket,
    stepCounter: number,
    hops: PacketHop[],
    snapshots: InFlightPacket[],
    baseTs: number,
  ): number {
    const senderNode = this.ifaceResolver.findNode(senderNodeId);
    const targetNode = this.ifaceResolver.findNode(targetNodeId);

    const arpRequestFrame = this.arpBuilder.buildRequestFrame(
      { ip: senderIp, mac: senderMac },
      targetIp,
    );

    stepCounter = this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.frameMaterializer.withArpFrameMacs(
        {
          nodeId: senderNodeId,
          nodeLabel: senderNode?.data.label ?? senderNodeId,
          srcIp: senderIp,
          dstIp: targetIp,
          ttl: 0,
          protocol: 'ARP',
          event: 'arp-request',
          toNodeId: targetNodeId,
          activeEdgeId: edgeId,
          arpFrame: arpRequestFrame,
          timestamp: baseTs,
        },
        arpRequestFrame,
      ),
      workingPacket,
      stepCounter,
    );

    const arpReplyFrame = this.arpBuilder.buildReplyFrame(
      { ip: targetIp, mac: targetMac },
      { ip: senderIp, mac: senderMac },
    );

    return this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.frameMaterializer.withArpFrameMacs(
        {
          nodeId: targetNodeId,
          nodeLabel: targetNode?.data.label ?? targetNodeId,
          srcIp: targetIp,
          dstIp: senderIp,
          ttl: 0,
          protocol: 'ARP',
          event: 'arp-reply',
          toNodeId: senderNodeId,
          activeEdgeId: edgeId,
          arpFrame: arpReplyFrame,
          timestamp: baseTs,
        },
        arpReplyFrame,
      ),
      workingPacket,
      stepCounter,
    );
  }
}
