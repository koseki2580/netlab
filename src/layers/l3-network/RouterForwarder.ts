import type { ForwardContext, ForwardDecision, Forwarder } from '../../types/layers';
import type { InFlightPacket } from '../../types/packets';
import type { RouteEntry } from '../../types/routing';
import type { Neighbor } from '../../types/simulation';
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

  private resolveNeighborForRoute(
    dstIp: string,
    route: RouteEntry,
    neighbors: Neighbor[],
  ): Neighbor | null {
    for (const neighbor of neighbors) {
      const neighborNode = this.topology.nodes.find((node) => node.id === neighbor.nodeId);
      if (!neighborNode) continue;

      if (route.nextHop === 'direct') {
        const nodeIp = neighborNode.data.runtimeIp ?? neighborNode.data.ip;
        if (nodeIp === dstIp) return neighbor;
        if ((neighborNode.data.interfaces ?? []).some((iface) => iface.ipAddress === dstIp)) {
          return neighbor;
        }
        if (neighborNode.data.role === 'switch') return neighbor;
        continue;
      }

      const ifaces = (neighborNode.data.interfaces ?? []) as Array<{ ipAddress: string }>;
      if (ifaces.some((iface) => iface.ipAddress === route.nextHop)) {
        return neighbor;
      }
      if (neighborNode.data.role === 'switch') return neighbor;
    }

    return null;
  }

  private lookupReachable(
    dstIp: string,
    neighbors: Neighbor[],
  ): { route: RouteEntry; neighbor: Neighbor } | null {
    const routes = this.topology.routeTables.get(this.nodeId) ?? [];
    const candidates = [...routes]
      .filter((route) => isInSubnet(dstIp, route.destination))
      .sort(
      (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
    );

    for (const route of candidates) {
      const neighbor = this.resolveNeighborForRoute(dstIp, route, neighbors);
      if (neighbor) {
        return { route, neighbor };
      }
    }

    return null;
  }

  private resolveEgressInterface(
    route: RouteEntry,
    dstIp: string,
    edgeId: string,
  ): string | undefined {
    const edge = this.topology.edges.find((candidate) => candidate.id === edgeId);
    if (edge) {
      const handle =
        edge.source === this.nodeId
          ? edge.sourceHandle
          : edge.target === this.nodeId
            ? edge.targetHandle
            : undefined;
      if (handle) return handle;
    }

    const node = this.topology.nodes.find((candidate) => candidate.id === this.nodeId);
    if (!node || node.data.role !== 'router') return undefined;

    const targetIp = route.nextHop === 'direct' ? dstIp : route.nextHop;
    const match = node.data.interfaces?.find((iface) =>
      isInSubnet(targetIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return match?.id;
  }

  async receive(
    packet: InFlightPacket,
    ingressPortId: string,
    ctx: ForwardContext,
  ): Promise<ForwardDecision> {
    const ipPacket = packet.frame.payload;

    if (ipPacket.ttl <= 1) {
      return { action: 'drop', reason: 'ttl-exceeded' };
    }

    const result = this.lookupReachable(ipPacket.dstIp, ctx.neighbors);
    if (!result) {
      return { action: 'drop', reason: 'no-route' };
    }
    const { route, neighbor } = result;

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

    const egressInterfaceId = this.resolveEgressInterface(
      route,
      ipPacket.dstIp,
      neighbor.edgeId,
    );

    return {
      action: 'forward',
      nextNodeId: neighbor.nodeId,
      edgeId: neighbor.edgeId,
      egressPort: route.nextHop === 'direct' ? ipPacket.dstIp : route.nextHop,
      egressInterfaceId,
      packet: updatedPacket,
      selectedRoute: route,
    };
  }
}
