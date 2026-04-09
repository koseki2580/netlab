import type { Forwarder, ForwardDecision } from '../../types/layers';
import type { InFlightPacket } from '../../types/packets';
import type { RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { isInSubnet, prefixLength } from '../../utils/cidr';
import { computeIpv4Checksum } from '../../utils/checksum';
import { buildIpv4HeaderBytes } from '../../utils/packetLayout';

export class RouterForwarder implements Forwarder {
  private readonly nodeId: string;
  private readonly topology: NetworkTopology;

  constructor(nodeId: string, topology: NetworkTopology) {
    this.nodeId = nodeId;
    this.topology = topology;
  }

  private lookup(dstIp: string): RouteEntry | null {
    const routes = this.topology.routeTables.get(this.nodeId) ?? [];

    // Routes should be sorted by prefix length descending (most specific first)
    const sorted = [...routes].sort(
      (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
    );

    for (const route of sorted) {
      if (isInSubnet(dstIp, route.destination)) {
        return route;
      }
    }
    return null;
  }

  async receive(
    packet: InFlightPacket,
    ingressPortId: string,
  ): Promise<ForwardDecision> {
    const ipPacket = packet.frame.payload;

    if (ipPacket.ttl <= 1) {
      return { action: 'drop', reason: 'ttl-exceeded' };
    }

    const route = this.lookup(ipPacket.dstIp);
    if (!route) {
      return { action: 'drop', reason: 'no-route' };
    }

    const updatedIp = { ...ipPacket, ttl: ipPacket.ttl - 1 };
    const headerBytes = buildIpv4HeaderBytes(updatedIp, { checksumOverride: 0 });
    const updatedIpWithChecksum = {
      ...updatedIp,
      headerChecksum: computeIpv4Checksum(headerBytes),
    };
    const updatedPacket: InFlightPacket = {
      ...packet,
      frame: { ...packet.frame, payload: updatedIpWithChecksum },
      ingressPortId,
    };

    if (route.nextHop === 'direct') {
      // Check if any connected node matches the destination IP
      const node = this.topology.nodes.find((n) => n.id === this.nodeId);
      const ifaces = node?.data.interfaces ?? [];
      const matchingIface = (ifaces as Array<{ ipAddress: string; id: string }>).find((iface) =>
        isInSubnet(ipPacket.dstIp, `${iface.ipAddress}/${route.destination.split('/')[1]}`),
      );
      const egressPort = matchingIface?.id ?? route.destination;
      return { action: 'forward', egressPort, packet: updatedPacket };
    }

    return {
      action: 'forward',
      egressPort: route.nextHop,
      packet: updatedPacket,
    };
  }
}
