import type { ForwardContext, ForwardDecision, Forwarder } from '../../types/layers';
import type { InFlightPacket } from '../../types/packets';
import type { RouteEntry } from '../../types/routing';
import type { Neighbor } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { stripTag, tagFrame } from '../l2-datalink/vlan';
import { isInSubnet, prefixLength } from '../../utils/cidr';
import { computeIpv4Checksum } from '../../utils/checksum';
import { buildIpv4HeaderBytes } from '../../utils/packetLayout';

interface LogicalRouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  parentInterfaceId?: string;
  vlanId?: number;
}

export class RouterForwarder implements Forwarder {
  private readonly nodeId: string;
  private readonly topology: NetworkTopology;
  private readonly arpTable = new Map<string, string>();

  constructor(nodeId: string, topology: NetworkTopology) {
    this.nodeId = nodeId;
    this.topology = topology;
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
        macAddress: iface.macAddress,
      };
      const subInterfaces = (iface.subInterfaces ?? []).map((subInterface) => ({
        id: subInterface.id,
        name: subInterface.id,
        ipAddress: subInterface.ipAddress,
        prefixLength: subInterface.prefixLength,
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

  private resolveNeighborForRoute(
    dstIp: string,
    route: RouteEntry,
    neighbors: Neighbor[],
  ): Neighbor | null {
    for (const neighbor of neighbors) {
      const neighborNode = this.topology.nodes.find((node) => node.id === neighbor.nodeId);
      if (!neighborNode) continue;

      const neighborInterfaceIps =
        neighborNode.data.role === 'router'
          ? this.getLogicalInterfacesForNode(neighborNode.id).map((iface) => iface.ipAddress)
          : (neighborNode.data.interfaces ?? []).map((iface) => iface.ipAddress);

      if (route.nextHop === 'direct') {
        const nodeIp = neighborNode.data.runtimeIp ?? neighborNode.data.ip;
        if (nodeIp === dstIp) return neighbor;
        if (neighborInterfaceIps.includes(dstIp)) {
          return neighbor;
        }
        if (neighborNode.data.role === 'switch') return neighbor;
        continue;
      }

      if (neighborInterfaceIps.includes(route.nextHop)) {
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
      .sort((a, b) => prefixLength(b.destination) - prefixLength(a.destination));

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
      if (!isInSubnet(targetIp, `${iface.ipAddress}/${iface.prefixLength}`)) {
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

    return logicalInterfaces.find((iface) =>
      isInSubnet(targetIp, `${iface.ipAddress}/${iface.prefixLength}`),
    )?.id;
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
      vlanId: ingressResolution.iface?.vlanId ?? packet.vlanId,
    };

    return {
      action: 'forward',
      nextNodeId: neighbor.nodeId,
      edgeId: neighbor.edgeId,
      egressPort: route.nextHop === 'direct' ? ipPacket.dstIp : route.nextHop,
      ingressInterfaceId: ingressResolution.iface?.id,
      egressInterfaceId,
      packet: updatedPacket,
      selectedRoute: route,
    };
  }
}
