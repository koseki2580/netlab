import type { FailureState } from '../../../types/failure';
import type { InFlightPacket } from '../../../types/packets';
import type { PacketHop } from '../../../types/simulation';
import { isInSubnet } from '../../../utils/cidr';
import { deriveDeterministicMac } from '../../../utils/network';
import { canonicalizeIpv6 } from '../../../utils/ipv6';
import { interfaceMatchesTarget } from '../../../layers/l3-network/logicalInterfaces';
import type { TraceRecorder } from '../../TraceRecorder';
import type { ArpBuilder, FrameMaterializer } from '../builders';
import type { InterfaceResolver, MacResolver, PortResolver } from '../resolvers';
import type { AddressPlane } from '../../AddressPlane';

const BROADCAST_IP = '255.255.255.255';

export interface ArpTargetInfo {
  targetIp: string;
  targetNodeId: string;
  senderIp: string;
  senderMac: string;
}

/** The ARP cache entry for what `deviceId` knows about `ip`: each device has its own. */
export const arpKey = (deviceId: string, ip: string): string => `${deviceId} ${ip}`;

export class ArpDispatcher {
  constructor(
    private readonly traceRecorder: TraceRecorder,
    private readonly ifaceResolver: InterfaceResolver,
    private readonly macResolver: MacResolver,
    private readonly portResolver: PortResolver,
    private readonly arpBuilder: ArpBuilder,
    private readonly frameMaterializer: FrameMaterializer,
    private readonly addresses: AddressPlane,
  ) {}

  resolveTargetInfo(
    currentNodeId: string,
    nextNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    egressInterfaceId?: string,
    edgeId?: string,
    nextHopIp?: string,
  ): ArpTargetInfo | null {
    const currentNode = this.ifaceResolver.findNode(currentNodeId);
    if (!currentNode) return null;
    if (packet.frame.payload.dstIp === BROADCAST_IP) return null;

    if (currentNode.data.role === 'router') {
      // Whom to ask for: the next hop the router's decision named.
      const targetIp = nextHopIp ?? packet.frame.payload.dstIp;

      const targetNode = this.macResolver.resolveEffectiveLayer2Destination(
        currentNodeId,
        nextNodeId,
        packet,
        failureState,
        nextHopIp,
      );
      if (!targetNode || !this.addresses.ownsIp(targetNode, targetIp)) return null;

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
      nextHopIp,
    );
    if (!targetNode) return null;

    const senderIp = this.addresses.nodeIp(currentNode) ?? '';
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
      targetIp = this.addresses.nodeIp(targetNode) ?? '';
    }

    if (!targetIp || !this.addresses.ownsIp(targetNode, targetIp)) return null;

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
    nextHopIp?: string,
  ): string {
    const resolvedMac = this.macResolver.resolveDstMac(
      currentNodeId,
      nextNodeId,
      egressInterfaceId,
      packet,
      failureState,
      nextHopIp,
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
          nextHopIp,
        ) ?? deriveDeterministicMac(targetNodeId)
      );
    }

    return (
      this.macResolver.resolveEndpointMac(targetNodeId) ?? deriveDeterministicMac(targetNodeId)
    );
  }

  /**
   * IPv6: whom the sender hands the frame to, by the same rules as ARP's
   * (RFC 4861 §7.2): a router its next hop, a host its gateway or the
   * destination on its own link.
   */
  resolveNeighborInfo(
    currentNodeId: string,
    nextNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    egressInterfaceId?: string,
    nextHopIp?: string,
  ): ArpTargetInfo | null {
    const current = this.ifaceResolver.findNode(currentNodeId);
    if (!current) return null;
    const dstIp = packet.frame.payload.dstIp;
    if (dstIp.toLowerCase().startsWith('ff')) return null;
    const target = this.macResolver.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
      nextHopIp,
    );
    if (!target) return null;
    const router = current.data.role === 'router';
    if (!router && current.data.role !== 'client' && current.data.role !== 'server') return null;
    const own = router
      ? (this.ifaceResolver.findLogicalById(currentNodeId, egressInterfaceId) ??
        this.ifaceResolver
          .getLogical(current)
          .find((iface) => iface.ipv6Address && interfaceMatchesTarget(iface, nextHopIp ?? dstIp)))
      : null;
    const senderIp = router ? own?.ipv6Address : current.data.ipv6;
    if (!senderIp) return null;
    const targetIp =
      target.data.role === 'router'
        ? router && nextHopIp && nextHopIp !== dstIp
          ? nextHopIp
          : this.ifaceResolver
              .getLogical(target)
              .find((iface) => iface.ipv6Address && interfaceMatchesTarget(iface, senderIp))
              ?.ipv6Address
        : target.data.ipv6;
    if (!targetIp) return null;
    return {
      targetIp: canonicalizeIpv6(targetIp),
      targetNodeId: target.id,
      senderIp: canonicalizeIpv6(senderIp),
      senderMac:
        (router ? own?.macAddress : this.macResolver.resolveEndpointMac(currentNodeId)) ??
        deriveDeterministicMac(currentNodeId),
    };
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
