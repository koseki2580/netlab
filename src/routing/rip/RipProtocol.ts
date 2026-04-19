import { ADMIN_DISTANCES, type RoutingProtocol, type RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { buildRouterAdjacency, getConnectedNetworks } from '../graphBuilder';

interface RipRouteState {
  destination: string;
  metric: number;
  nextHop: string;
}

export class RipProtocol implements RoutingProtocol {
  name = 'rip' as const;
  adminDistance = ADMIN_DISTANCES.rip;

  computeRoutes(topology: NetworkTopology): RouteEntry[] {
    const ripRouters = topology.nodes.filter(
      (node) => node.data.role === 'router' && node.data.ripConfig,
    );
    if (ripRouters.length === 0) {
      return [];
    }

    const participatingRouterIds = new Set(ripRouters.map((node) => node.id));
    const adjacency = buildRouterAdjacency(topology);
    let tables = new Map<string, Map<string, RipRouteState>>();

    for (const router of ripRouters) {
      const configuredNetworks = new Set(router.data.ripConfig?.networks ?? []);
      const routeTable = new Map<string, RipRouteState>();

      for (const network of getConnectedNetworks(router).map((connected) => connected.cidr)) {
        if (!configuredNetworks.has(network)) continue;
        routeTable.set(network, {
          destination: network,
          metric: 0,
          nextHop: 'direct',
        });
      }

      tables.set(router.id, routeTable);
    }

    for (let iteration = 0; iteration < ripRouters.length - 1; iteration += 1) {
      const snapshot = cloneTables(tables);
      const nextTables = cloneTables(tables);
      let changed = false;

      for (const router of ripRouters) {
        const routeTable = nextTables.get(router.id) ?? new Map<string, RipRouteState>();

        for (const neighbor of adjacency.get(router.id) ?? []) {
          if (!participatingRouterIds.has(neighbor.neighborId)) continue;

          for (const route of snapshot.get(neighbor.neighborId)?.values() ?? []) {
            const newMetric = route.metric + 1;
            if (newMetric > 15) continue;

            const existing = routeTable.get(route.destination);
            if (!existing || newMetric < existing.metric) {
              routeTable.set(route.destination, {
                destination: route.destination,
                metric: newMetric,
                nextHop: neighbor.neighborIface.ipAddress,
              });
              changed = true;
            }
          }
        }

        nextTables.set(router.id, routeTable);
      }

      tables = nextTables;
      if (!changed) break;
    }

    return Array.from(tables.entries())
      .flatMap(([nodeId, routeTable]) =>
        Array.from(routeTable.values()).map<RouteEntry>((route) => ({
          destination: route.destination,
          nextHop: route.nextHop,
          metric: route.metric,
          protocol: 'rip',
          adminDistance: this.adminDistance,
          nodeId,
        })),
      )
      .sort(
        (left, right) =>
          left.nodeId.localeCompare(right.nodeId) ||
          left.destination.localeCompare(right.destination),
      );
  }
}

export const ripProtocol = new RipProtocol();

function cloneTables(
  tables: Map<string, Map<string, RipRouteState>>,
): Map<string, Map<string, RipRouteState>> {
  return new Map(
    Array.from(tables.entries()).map(([nodeId, routeTable]) => [
      nodeId,
      new Map(
        Array.from(routeTable.entries()).map(([destination, route]) => [destination, { ...route }]),
      ),
    ]),
  );
}
