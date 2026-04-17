import { ADMIN_DISTANCES, type RoutingProtocol, type RouteEntry } from '../../types/routing';
import type { RouterInterface } from '../../types/routing';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { buildRouterAdjacency, getConnectedNetworks } from '../graphBuilder';

interface SpfState {
  distance: number;
  nextHop: string | null;
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function intToIp(value: number): string {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join('.');
}

function toNetworkCidr(iface: RouterInterface): string {
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
      const advertisedNetworks = getAdvertisedNetworks(router);
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
        if (targetId === router.id || state.nextHop === null) continue;

        const targetRouter = routerById.get(targetId);
        if (!targetRouter) continue;

        for (const network of getAdvertisedNetworks(targetRouter)) {
          const existing = bestRoutes.get(network);
          if (!existing || state.distance < existing.metric) {
            bestRoutes.set(network, {
              destination: network,
              nextHop: state.nextHop,
              metric: state.distance,
              protocol: 'ospf',
              adminDistance: this.adminDistance,
              nodeId: router.id,
            });
          }
        }
      }

      routes.push(...bestRoutes.values());
    }

    return routes.sort(
      (left, right) =>
        left.nodeId.localeCompare(right.nodeId) || left.destination.localeCompare(right.destination),
    );
  }
}

export const ospfProtocol = new OspfProtocol();

function getAdvertisedNetworks(node: NetlabNode): string[] {
  const configuredNetworks = new Set(
    node.data.ospfConfig?.areas.flatMap((area) => area.networks) ?? [],
  );
  return getConnectedNetworks(node)
    .map((network) => network.cidr)
    .filter((network) => configuredNetworks.has(network));
}

function resolveLinkCost(node: NetlabNode, iface: RouterInterface): number {
  const network = toNetworkCidr(iface);

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
  const states = new Map<string, SpfState>([[source.id, { distance: 0, nextHop: null }]]);
  const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: source.id, distance: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    queue.sort((left, right) => left.distance - right.distance || left.nodeId.localeCompare(right.nodeId));
    const current = queue.shift();
    if (!current || visited.has(current.nodeId)) continue;

    visited.add(current.nodeId);
    const currentNode = routerById.get(current.nodeId);
    const currentState = states.get(current.nodeId);
    if (!currentNode || !currentState) continue;

    for (const neighbor of adjacency.get(current.nodeId) ?? []) {
      if (!participatingRouterIds.has(neighbor.neighborId)) continue;

      const newDistance = currentState.distance + resolveLinkCost(currentNode, neighbor.localIface);
      const nextHop =
        current.nodeId === source.id ? neighbor.neighborIface.ipAddress : currentState.nextHop;
      const existing = states.get(neighbor.neighborId);

      if (
        !existing ||
        newDistance < existing.distance ||
        (newDistance === existing.distance && nextHop !== null && (existing.nextHop === null || nextHop < existing.nextHop))
      ) {
        states.set(neighbor.neighborId, {
          distance: newDistance,
          nextHop,
        });
        queue.push({ nodeId: neighbor.neighborId, distance: newDistance });
      }
    }
  }

  return states;
}
