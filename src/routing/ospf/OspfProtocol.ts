import { ADMIN_DISTANCES, type RoutingProtocol, type RouteEntry } from '../../types/routing';
import type { RouterInterface } from '../../types/routing';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { withEqualCostNextHops } from '../ecmp';
import { buildRouterAdjacency, isInterfaceOnDownLink } from '../graphBuilder';

interface SpfState {
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

function toNetworkCidr(iface: Pick<RouterInterface, 'ipAddress' | 'prefixLength'>): string {
  if (iface.prefixLength === 0) return '0.0.0.0/0';
  const mask = (~0 << (32 - iface.prefixLength)) >>> 0;
  return `${intToIp(ipToInt(iface.ipAddress) & mask)}/${iface.prefixLength}`;
}

export class OspfProtocol implements RoutingProtocol {
  name = 'ospf' as const;
  adminDistance = ADMIN_DISTANCES.ospf;

  computeRoutes(topology: NetworkTopology): RouteEntry[] {
    const ospfRouters = topology.nodes.filter(
      (node) => node.data.role === 'router' && node.data.ospfConfig,
    );
    if (ospfRouters.length === 0) {
      return [];
    }

    const adjacency = buildRouterAdjacency(topology);
    const participatingRouterIds = new Set(ospfRouters.map((node) => node.id));
    const routerById = new Map(ospfRouters.map((node) => [node.id, node]));
    const routes: RouteEntry[] = [];

    for (const router of ospfRouters) {
      const bestRoutes = new Map<string, RouteEntry>();
      const advertisedNetworks = getAdvertisedNetworks(topology, router).keys();
      const spf = runSpf(router, adjacency, routerById, participatingRouterIds);

      for (const network of advertisedNetworks) {
        bestRoutes.set(network, {
          destination: network,
          nextHop: 'direct',
          metric: 0,
          protocol: 'ospf',
          adminDistance: this.adminDistance,
          nodeId: router.id,
        });
      }

      for (const [targetId, state] of spf.entries()) {
        if (targetId === router.id || state.nextHops.length === 0) continue;

        const targetRouter = routerById.get(targetId);
        if (!targetRouter) continue;

        // RFC 2328 16.1: a stub network's cost is the cost to the router that
        // owns it plus that router's interface cost onto the network.
        for (const [network, stubCost] of getAdvertisedNetworks(topology, targetRouter)) {
          const metric = state.distance + stubCost;
          const existing = bestRoutes.get(network);
          if (existing && metric > existing.metric) continue;
          if (existing?.nextHop === 'direct') continue;

          const nextHops =
            existing && metric === existing.metric
              ? [
                  ...(existing.equalCostNextHops?.map((hop) => hop.nextHop) ?? [existing.nextHop]),
                  ...state.nextHops,
                ]
              : state.nextHops;
          const route: RouteEntry = {
            destination: network,
            nextHop: nextHops[0] ?? 'direct',
            metric,
            protocol: 'ospf',
            adminDistance: this.adminDistance,
            nodeId: router.id,
          };
          bestRoutes.set(
            network,
            withEqualCostNextHops(
              route,
              nextHops.map((nextHop) => ({ nextHop })),
            ),
          );
        }
      }

      routes.push(...bestRoutes.values());
    }

    return routes.sort(
      (left, right) =>
        left.nodeId.localeCompare(right.nodeId) ||
        left.destination.localeCompare(right.destination),
    );
  }
}

export const ospfProtocol = new OspfProtocol();

/**
 * The networks `node` advertises, each with the cost of its interface onto it.
 * An interface on a failed link is down, so its network is not advertised.
 */
function getAdvertisedNetworks(topology: NetworkTopology, node: NetlabNode): Map<string, number> {
  const configuredNetworks = new Set(
    node.data.ospfConfig?.areas.flatMap((area) => area.networks) ?? [],
  );
  const advertised = new Map<string, number>();

  for (const iface of node.data.interfaces ?? []) {
    if (isInterfaceOnDownLink(topology, node.id, iface)) continue;
    for (const addressed of [iface, ...(iface.subInterfaces ?? [])]) {
      const network = toNetworkCidr(addressed);
      if (configuredNetworks.has(network) && !advertised.has(network)) {
        advertised.set(network, resolveNetworkCost(node, network));
      }
    }
  }

  return advertised;
}

/** The OSPF cost `node` charges for sending out of `iface` (default 1). */
export function ospfInterfaceCost(node: NetlabNode, iface: RouterInterface): number {
  return resolveNetworkCost(node, toNetworkCidr(iface));
}

function resolveNetworkCost(node: NetlabNode, network: string): number {
  for (const area of node.data.ospfConfig?.areas ?? []) {
    if (area.networks.includes(network)) {
      return area.cost ?? 1;
    }
  }

  return 1;
}

function runSpf(
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
