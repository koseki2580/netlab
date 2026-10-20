import { type FailureState, EMPTY_FAILURE_STATE } from '../../../types/failure';
import type { Neighbor } from '../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import {
  bestRoute,
  interfaceMatchesTarget,
  logicalInterfaces,
  type LogicalRouterInterface,
} from '../../../layers/l3-network/logicalInterfaces';

export type { LogicalRouterInterface };

export interface ResolvedInterface {
  id: string;
  name: string;
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
      if (edge.data?.state === 'down') continue;
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

    const match = this.getLogical(node).find((iface) => interfaceMatchesTarget(iface, targetIp));

    return match ? { id: match.id, name: match.name } : null;
  }

  resolveIngress(nodeId: string, senderIp: string): ResolvedInterface | null {
    const node = this.topology.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const match = this.getLogical(node).find((iface) => interfaceMatchesTarget(iface, senderIp));

    return match ? { id: match.id, name: match.name } : null;
  }

  getLogical(node: NetlabNode | null): LogicalRouterInterface[] {
    return logicalInterfaces(node);
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
          interfaceMatchesTarget(candidate, senderIp),
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
