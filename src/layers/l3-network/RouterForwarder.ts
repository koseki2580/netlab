import type { ForwardContext, ForwardDecision, Forwarder } from '../../types/layers';
import { isIpv6Packet, type InFlightPacket } from '../../types/packets';
import type { EqualCostNextHop, RouteEntry } from '../../types/routing';
import type { EcmpTrace } from '../../types/simulation';
import { reachesFrom } from '../reachability';
import type { Neighbor } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { stripTag, tagFrame } from '../l2-datalink/vlan';
import { isInSubnet, prefixLength } from '../../utils/cidr';
import { computeIpv4Checksum } from '../../utils/checksum';
import { bucketFlow, flowKeyFromPacket, hashFlow, hashString32 } from '../../utils/hashFlow';
import { isIpv6Address } from '../../utils/ipv6';
import { buildIpv4HeaderBytes } from '../../utils/packetLayout';

interface LogicalRouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  ipv6Address?: string;
  prefixLength6?: number;
  macAddress: string;
  parentInterfaceId?: string;
  vlanId?: number;
}

function interfaceMatchesTarget(iface: LogicalRouterInterface, targetIp: string): boolean {
  if (isIpv6Address(targetIp)) {
    return iface.ipv6Address !== undefined && iface.prefixLength6 !== undefined
      ? isInSubnet(targetIp, `${iface.ipv6Address}/${iface.prefixLength6}`)
      : false;
  }
  return isInSubnet(targetIp, `${iface.ipAddress}/${iface.prefixLength}`);
}

export class RouterForwarder implements Forwarder {
  private readonly nodeId: string;
  private readonly topology: NetworkTopology;
  private readonly arpTable = new Map<string, string>();
  private readonly routerSeed: number;

  constructor(nodeId: string, topology: NetworkTopology) {
    this.nodeId = nodeId;
    this.topology = topology;
    this.routerSeed = hashString32(nodeId, 0x81e);
    this.seedArpTable();
  }

  getArpTable(): ReadonlyMap<string, string> {
    return this.arpTable;
  }

  resolveArpMac(ipAddress: string, vlanId?: number): string | null {
    return (
      this.arpTable.get(this.arpKey(ipAddress, vlanId)) ?? this.arpTable.get(ipAddress) ?? null
    );
  }

  private arpKey(ipAddress: string, vlanId?: number): string {
    return `${vlanId ?? 0}:${ipAddress}`;
  }

  private getRouterNode() {
    const node = this.topology.nodes.find((candidate) => candidate.id === this.nodeId);
    return node?.data.role === 'router' ? node : null;
  }

  private getLogicalInterfacesForNode(nodeId: string): LogicalRouterInterface[] {
    const node = this.topology.nodes.find((candidate) => candidate.id === nodeId);
    if (node?.data.role !== 'router') {
      return [];
    }

    return (node.data.interfaces ?? []).flatMap((iface) => {
      const parent: LogicalRouterInterface = {
        id: iface.id,
        name: iface.name,
        ipAddress: iface.ipAddress,
        prefixLength: iface.prefixLength,
        ...(iface.ipv6Address !== undefined ? { ipv6Address: iface.ipv6Address } : {}),
        ...(iface.prefixLength6 !== undefined ? { prefixLength6: iface.prefixLength6 } : {}),
        macAddress: iface.macAddress,
      };
      const subInterfaces = (iface.subInterfaces ?? []).map((subInterface) => ({
        id: subInterface.id,
        name: subInterface.id,
        ipAddress: subInterface.ipAddress,
        prefixLength: subInterface.prefixLength,
        ...(subInterface.ipv6Address !== undefined
          ? { ipv6Address: subInterface.ipv6Address }
          : {}),
        ...(subInterface.prefixLength6 !== undefined
          ? { prefixLength6: subInterface.prefixLength6 }
          : {}),
        macAddress: iface.macAddress,
        parentInterfaceId: iface.id,
        vlanId: subInterface.vlanId,
      }));
      return [parent, ...subInterfaces];
    });
  }

  private findLogicalInterfaceById(interfaceId: string): LogicalRouterInterface | null {
    return (
      this.getLogicalInterfacesForNode(this.nodeId).find((iface) => iface.id === interfaceId) ??
      null
    );
  }

  private seedArpTable(): void {
    const node = this.getRouterNode();
    if (!node) return;

    for (const [key, mac] of Object.entries(node.data.arpTable ?? {})) {
      this.arpTable.set(key, mac);
    }
  }

  private resolveIngressInterface(
    ingressPortId: string,
    packet: InFlightPacket,
  ): { iface: LogicalRouterInterface | null; reason?: string } {
    const node = this.getRouterNode();
    if (!node) {
      return { iface: null };
    }

    const parentInterface = (node.data.interfaces ?? []).find(
      (iface) => iface.id === ingressPortId,
    );
    const directLogical = this.findLogicalInterfaceById(ingressPortId);
    if (!parentInterface) {
      return { iface: directLogical };
    }

    const ingressVlanId = packet.frame.vlanTag?.vid;
    if (ingressVlanId === undefined) {
      return { iface: directLogical };
    }

    const subInterface = parentInterface.subInterfaces?.find(
      (candidate) => candidate.vlanId === ingressVlanId,
    );
    if (!subInterface) {
      return { iface: null, reason: 'no-sub-interface-for-vlan' };
    }

    return {
      iface: this.findLogicalInterfaceById(subInterface.id),
    };
  }

  /**
   * Whether the address `dstIp` names is somewhere behind `neighbor`, rather
   * than merely behind some switch. Accepting any switch sent the gallery's
   * first lesson back down the link its packet arrived on: both of that
   * router's routes are `direct` and both of its neighbours are switches, so
   * the first one listed won, and the client's packet returned to the client
   * as a routing loop.
   */
  private ownerOfIpIsBehind(neighborNodeId: string, dstIp: string): boolean {
    return reachesFrom(this.topology, this.nodeId, neighborNodeId, (nodeId) => {
      const node = this.topology.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) return false;
      if (node.data.ip === dstIp || node.data.runtimeIp === dstIp || node.data.ipv6 === dstIp) {
        return true;
      }
      return (node.data.interfaces ?? []).some(
        (iface) => iface.ipAddress === dstIp || iface.ipv6Address === dstIp,
      );
    });
  }

  private resolveNeighborForRoute(
    dstIp: string,
    nextHop: string,
    neighbors: Neighbor[],
  ): Neighbor | null {
    for (const neighbor of neighbors) {
      const neighborNode = this.topology.nodes.find((node) => node.id === neighbor.nodeId);
      if (!neighborNode) continue;

      const neighborInterfaceIps =
        neighborNode.data.role === 'router'
          ? this.getLogicalInterfacesForNode(neighborNode.id).flatMap((iface) => [
              iface.ipAddress,
              ...(iface.ipv6Address !== undefined ? [iface.ipv6Address] : []),
            ])
          : (neighborNode.data.interfaces ?? []).map((iface) => iface.ipAddress);
      const neighborNodeIp = isIpv6Address(dstIp)
        ? neighborNode.data.ipv6
        : (neighborNode.data.runtimeIp ?? neighborNode.data.ip);

      if (nextHop === 'direct') {
        if (neighborNodeIp === dstIp) return neighbor;
        if (neighborInterfaceIps.includes(dstIp)) {
          return neighbor;
        }
        if (neighborNode.data.role === 'switch' && this.ownerOfIpIsBehind(neighbor.nodeId, dstIp)) {
          return neighbor;
        }
        continue;
      }

      if (neighborInterfaceIps.includes(nextHop)) {
        return neighbor;
      }
      if (neighborNode.data.role === 'switch' && this.ownerOfIpIsBehind(neighbor.nodeId, nextHop)) {
        return neighbor;
      }
    }

    // Nothing named the destination, which is the ordinary case for a subnet
    // whose hosts are not in the topology. Any switch will do then, as before.
    for (const neighbor of neighbors) {
      const neighborNode = this.topology.nodes.find((node) => node.id === neighbor.nodeId);
      if (neighborNode?.data.role === 'switch') return neighbor;
    }

    return null;
  }

  private lookupReachable(
    dstIp: string,
    packet: InFlightPacket,
    neighbors: Neighbor[],
  ): { route: RouteEntry; neighbor: Neighbor; ecmpTrace?: EcmpTrace } | null {
    const routes = this.topology.routeTables.get(this.nodeId) ?? [];
    const candidates = [...routes]
      .filter((route) => isInSubnet(dstIp, route.destination))
      .sort((a, b) => prefixLength(b.destination) - prefixLength(a.destination));

    for (const route of candidates) {
      const nextHops = this.expandNextHops(route);
      const reachable = nextHops
        .map((nextHop) => ({
          nextHop,
          neighbor: this.resolveNeighborForRoute(dstIp, nextHop.nextHop, neighbors),
        }))
        .filter(
          (candidate): candidate is { nextHop: EqualCostNextHop; neighbor: Neighbor } =>
            candidate.neighbor !== null,
        );
      if (reachable.length === 0) {
        continue;
      }

      const flowKey = flowKeyFromPacket(packet);
      const bucket =
        reachable.length === 1 ? 0 : bucketFlow(flowKey, reachable.length, this.routerSeed);
      const selected = reachable[bucket];
      if (!selected) {
        continue;
      }
      const selectedRoute: RouteEntry = {
        ...route,
        nextHop: selected.nextHop.nextHop,
        ...(selected.nextHop.outIfId !== undefined ? { outIfId: selected.nextHop.outIfId } : {}),
      };
      const ecmpTrace =
        reachable.length > 1
          ? {
              routerId: this.nodeId,
              flowHash: hashFlow(flowKey, this.routerSeed),
              bucket,
              candidateCount: reachable.length,
              chosen: {
                nextHop: selected.nextHop.nextHop,
                ...(selected.nextHop.outIfId !== undefined
                  ? { outIfId: selected.nextHop.outIfId }
                  : {}),
              },
            }
          : undefined;

      return {
        route: selectedRoute,
        neighbor: selected.neighbor,
        ...(ecmpTrace !== undefined ? { ecmpTrace } : {}),
      };
    }

    return null;
  }

  private expandNextHops(route: RouteEntry): EqualCostNextHop[] {
    const configured = route.equalCostNextHops ?? [];
    if (configured.length > 0) {
      return configured.map((candidate) => ({
        nextHop: candidate.nextHop,
        ...(candidate.outIfId !== undefined ? { outIfId: candidate.outIfId } : {}),
      }));
    }
    return [
      {
        nextHop: route.nextHop,
        ...(route.outIfId !== undefined ? { outIfId: route.outIfId } : {}),
      },
    ];
  }

  private resolveEgressInterface(
    route: RouteEntry,
    dstIp: string,
    edgeId: string,
  ): string | undefined {
    if (route.outIfId) {
      return route.outIfId;
    }

    const logicalInterfaces = this.getLogicalInterfacesForNode(this.nodeId);
    const edge = this.topology.edges.find((candidate) => candidate.id === edgeId);
    const edgeHandle =
      edge?.source === this.nodeId
        ? edge.sourceHandle
        : edge?.target === this.nodeId
          ? edge.targetHandle
          : undefined;
    const targetIp = route.nextHop === 'direct' ? dstIp : route.nextHop;

    const matchedInterface = logicalInterfaces.find((iface) => {
      if (!interfaceMatchesTarget(iface, targetIp)) {
        return false;
      }
      if (!edgeHandle) {
        return true;
      }
      return iface.id === edgeHandle || iface.parentInterfaceId === edgeHandle;
    });

    if (matchedInterface) {
      return matchedInterface.id;
    }

    if (edgeHandle) {
      return edgeHandle;
    }

    return logicalInterfaces.find((iface) => interfaceMatchesTarget(iface, targetIp))?.id;
  }

  async receive(
    packet: InFlightPacket,
    ingressPortId: string,
    ctx: ForwardContext,
  ): Promise<ForwardDecision> {
    const ipPacket = packet.frame.payload;
    const ingressResolution = this.resolveIngressInterface(ingressPortId, packet);
    if (!ingressResolution.iface && ingressResolution.reason) {
      return { action: 'drop', reason: ingressResolution.reason };
    }

    if (ipPacket.ttl <= 1) {
      return { action: 'drop', reason: 'ttl-exceeded' };
    }

    const result = this.lookupReachable(ipPacket.dstIp, packet, ctx.neighbors);
    if (!result) {
      return { action: 'drop', reason: 'no-route' };
    }
    const { route, neighbor, ecmpTrace } = result;

    const updatedIp = isIpv6Packet(ipPacket)
      ? { ...ipPacket, ttl: ipPacket.ttl - 1, hopLimit: ipPacket.hopLimit - 1 }
      : { ...ipPacket, ttl: ipPacket.ttl - 1 };
    const updatedIpWithChecksum = isIpv6Packet(updatedIp)
      ? updatedIp
      : {
          ...updatedIp,
          headerChecksum: computeIpv4Checksum(
            buildIpv4HeaderBytes(updatedIp, { checksumOverride: 0 }),
          ),
        };

    const egressInterfaceId = this.resolveEgressInterface(route, ipPacket.dstIp, neighbor.edgeId);
    const egressInterface = egressInterfaceId
      ? this.findLogicalInterfaceById(egressInterfaceId)
      : null;

    const updatedFrameBase = {
      ...packet.frame,
      payload: updatedIpWithChecksum,
    };
    const updatedFrame = egressInterface?.vlanId
      ? tagFrame(stripTag(updatedFrameBase), egressInterface.vlanId)
      : stripTag(updatedFrameBase);

    const updatedPacket: InFlightPacket = {
      ...packet,
      frame: updatedFrame,
      ingressPortId,
      ...((ingressResolution.iface?.vlanId ?? packet.vlanId) !== undefined
        ? { vlanId: ingressResolution.iface?.vlanId ?? packet.vlanId }
        : {}),
    };

    return {
      action: 'forward',
      nextNodeId: neighbor.nodeId,
      edgeId: neighbor.edgeId,
      egressPort: route.nextHop === 'direct' ? ipPacket.dstIp : route.nextHop,
      packet: updatedPacket,
      ...(ingressResolution.iface?.id !== undefined
        ? { ingressInterfaceId: ingressResolution.iface.id }
        : {}),
      ...(egressInterfaceId !== undefined ? { egressInterfaceId } : {}),
      selectedRoute: route,
      ...(ecmpTrace !== undefined ? { ecmpTrace } : {}),
    };
  }
}
