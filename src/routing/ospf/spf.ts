/** What every OSPF calculation shares: network names, interface costs, and SPF over one graph. */

import type { RouterInterface } from '../../types/routing';
import type { NetlabNode } from '../../types/topology';
import type { buildRouterAdjacency } from '../graphBuilder';

export interface SpfState {
  distance: number;
  nextHops: string[];
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function intToIp(value: number): string {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join(
    '.',
  );
}

export function toNetworkCidr(iface: Pick<RouterInterface, 'ipAddress' | 'prefixLength'>): string {
  if (iface.prefixLength === 0) return '0.0.0.0/0';
  const mask = (~0 << (32 - iface.prefixLength)) >>> 0;
  return `${intToIp(ipToInt(iface.ipAddress) & mask)}/${iface.prefixLength}`;
}

/** The OSPF cost `node` charges for sending out of `iface` (default 1). */
export function ospfInterfaceCost(node: NetlabNode, iface: RouterInterface): number {
  return resolveNetworkCost(node, toNetworkCidr(iface));
}

export function resolveNetworkCost(node: NetlabNode, network: string): number {
  for (const area of node.data.ospfConfig?.areas ?? []) {
    if (area.networks.includes(network)) {
      return area.cost ?? 1;
    }
  }

  return 1;
}

export function runSpf(
  source: NetlabNode,
  adjacency: ReturnType<typeof buildRouterAdjacency>,
  routerById: Map<string, NetlabNode>,
  participatingRouterIds: Set<string>,
): Map<string, SpfState> {
  const states = new Map<string, SpfState>([[source.id, { distance: 0, nextHops: [] }]]);
  const queue: { nodeId: string; distance: number }[] = [{ nodeId: source.id, distance: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    queue.sort(
      (left, right) => left.distance - right.distance || left.nodeId.localeCompare(right.nodeId),
    );
    const current = queue.shift();
    if (!current || visited.has(current.nodeId)) continue;

    visited.add(current.nodeId);
    const currentNode = routerById.get(current.nodeId);
    const currentState = states.get(current.nodeId);
    if (!currentNode || !currentState) continue;

    for (const neighbor of adjacency.get(current.nodeId) ?? []) {
      if (!participatingRouterIds.has(neighbor.neighborId)) continue;

      const newDistance =
        currentState.distance + ospfInterfaceCost(currentNode, neighbor.localIface);
      // Every first hop that reaches `current` also reaches its neighbor, so a
      // router behind an equal-cost split inherits all of them, not the first.
      const candidateHops =
        current.nodeId === source.id ? [neighbor.neighborIface.ipAddress] : currentState.nextHops;
      const existing = states.get(neighbor.neighborId);
      if (candidateHops.length === 0) continue;

      if (!existing || newDistance < existing.distance) {
        states.set(neighbor.neighborId, {
          distance: newDistance,
          nextHops: [...candidateHops],
        });
        queue.push({ nodeId: neighbor.neighborId, distance: newDistance });
        continue;
      }

      const added = candidateHops.filter((hop) => !existing.nextHops.includes(hop));
      if (newDistance === existing.distance && added.length > 0) {
        states.set(neighbor.neighborId, {
          distance: existing.distance,
          nextHops: [...existing.nextHops, ...added].sort(),
        });
        queue.push({ nodeId: neighbor.neighborId, distance: newDistance });
      }
    }
  }

  return states;
}
