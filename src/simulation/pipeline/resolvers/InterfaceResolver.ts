import { type FailureState, EMPTY_FAILURE_STATE } from '../../../types/failure';
import type { RouteEntry } from '../../../types/routing';
import type { Neighbor } from '../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { isInSubnet, prefixLength } from '../../../utils/cidr';

export interface ResolvedInterface {
  id: string;
  name: string;
}

export interface LogicalRouterInterface extends ResolvedInterface {
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  mtu?: number;
  parentInterfaceId?: string;
  vlanId?: number;
}

function bestRoute(dstIp: string, routes: RouteEntry[]): RouteEntry | null {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  return sorted.find((r) => isInSubnet(dstIp, r.destination)) ?? null;
}

export class InterfaceResolver {
  constructor(private readonly topology: NetworkTopology) {}

  findNode(nodeId: string): NetlabNode | null {
    return this.topology.nodes.find((candidate) => candidate.id === nodeId) ?? null;
  }

  getNeighbors(
    nodeId: string,
    excludeNodeId: string | null = null,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Neighbor[] {
    const result: Neighbor[] = [];
    for (const edge of this.topology.edges) {
      if (failureState.downEdgeIds.has(edge.id)) continue;
      if (edge.source === nodeId && edge.target !== excludeNodeId) {
        result.push({ nodeId: edge.target, edgeId: edge.id });
      } else if (edge.target === nodeId && edge.source !== excludeNodeId) {
        result.push({ nodeId: edge.source, edgeId: edge.id });
      }
    }
    return result;
  }

  resolveEgress(nodeId: string, dstIp: string, overrideNextHop?: string): ResolvedInterface | null {
    const node = this.topology.nodes.find((n) => n.id === nodeId);
    if (node?.data.role !== 'router') return null;

    let targetIp: string;
    if (overrideNextHop !== undefined) {
      targetIp = overrideNextHop === 'direct' ? dstIp : overrideNextHop;
    } else {
      const routes = this.topology.routeTables.get(nodeId) ?? [];
      const route = bestRoute(dstIp, routes);
      if (!route) return null;
      targetIp = route.nextHop === 'direct' ? dstIp : route.nextHop;
    }

    const match = this.getLogical(node).find((iface) =>
      isInSubnet(targetIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return match ? { id: match.id, name: match.name } : null;
  }

  resolveIngress(nodeId: string, senderIp: string): ResolvedInterface | null {
    const node = this.topology.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const match = this.getLogical(node).find((iface) =>
      isInSubnet(senderIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return match ? { id: match.id, name: match.name } : null;
  }

  getLogical(node: NetlabNode | null): LogicalRouterInterface[] {
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
        ...(iface.mtu !== undefined ? { mtu: iface.mtu } : {}),
      };
      const subInterfaces = (iface.subInterfaces ?? []).map((subInterface) => ({
        id: subInterface.id,
        name: subInterface.id,
        ipAddress: subInterface.ipAddress,
        prefixLength: subInterface.prefixLength,
        macAddress: iface.macAddress,
        ...((subInterface.mtu ?? iface.mtu) !== undefined
          ? { mtu: subInterface.mtu ?? iface.mtu }
          : {}),
        parentInterfaceId: iface.id,
        vlanId: subInterface.vlanId,
      }));
      return [parent, ...subInterfaces];
    });
  }

  findLogicalById(nodeId: string, interfaceId: string | undefined): LogicalRouterInterface | null {
    if (!interfaceId) return null;
    const node = this.findNode(nodeId);
    return this.getLogical(node).find((iface) => iface.id === interfaceId) ?? null;
  }

  findGatewayThroughSwitches(
    switchNodeId: string,
    sourceNodeId: string,
    senderIp: string,
    failureState: FailureState,
    visited = new Set<string>(),
  ): { node: NetlabNode; iface: LogicalRouterInterface } | null {
    if (visited.has(switchNodeId)) return null;
    visited.add(switchNodeId);

    const neighbors = this.getNeighbors(switchNodeId, sourceNodeId, failureState);
    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node) continue;
      if (node.data.role === 'router') {
        const iface = this.getLogical(node).find((candidate) =>
          isInSubnet(senderIp, `${candidate.ipAddress}/${candidate.prefixLength}`),
        );
        if (iface) {
          return { node, iface };
        }
      }
    }

    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (node?.data.role !== 'switch') continue;

      const match = this.findGatewayThroughSwitches(
        node.id,
        switchNodeId,
        senderIp,
        failureState,
        visited,
      );
      if (match) return match;
    }

    return null;
  }
}
