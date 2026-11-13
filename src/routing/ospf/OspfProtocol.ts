import { ADMIN_DISTANCES, type RoutingProtocol, type RouteEntry } from '../../types/routing';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { withEqualCostNextHops } from '../ecmp';
import { buildRouterAdjacency, isInterfaceOnDownLink } from '../graphBuilder';
import { computeAreaRoutes, isAreaAware } from './OspfAreas';
import { resolveNetworkCost, runSpf, toNetworkCidr } from './spf';

export { ospfInterfaceCost } from './spf';

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

    // Several areas, or anything from outside OSPF: the area-by-area calculation.
    // One area keeps this whole-graph SPF, which gives the same paths.
    if (isAreaAware(topology)) {
      return computeAreaRoutes(topology, this.adminDistance);
    }

    const adjacency = buildRouterAdjacency(topology);
    const participatingRouterIds = new Set(ospfRouters.map((node) => node.id));
    const routerById = new Map(ospfRouters.map((node) => [node.id, node]));
    const routes: RouteEntry[] = [];

    for (const router of ospfRouters) {
      const bestRoutes = new Map<string, RouteEntry>();
      const advertisedNetworks = getAdvertisedNetworks(topology, router);
      const spf = runSpf(router, adjacency, routerById, participatingRouterIds);

      // RFC 2328 §12.4.1, §16.1: an attached network costs the interface onto it.
      for (const [network, interfaceCost] of advertisedNetworks) {
        bestRoutes.set(network, {
          destination: network,
          nextHop: 'direct',
          metric: interfaceCost,
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
