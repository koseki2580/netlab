import { ADMIN_DISTANCES, type RouteEntry, type RoutingProtocol } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { installEqualCostNextHops } from '../ecmp';

export class StaticProtocol implements RoutingProtocol {
  name = 'static' as const;
  adminDistance = ADMIN_DISTANCES.static;

  computeRoutes(topology: NetworkTopology): RouteEntry[] {
    const entries: RouteEntry[] = [];

    for (const node of topology.nodes) {
      if (node.data.role !== 'router') continue;

      const staticRoutes = node.data.staticRoutes ?? [];
      for (const r of staticRoutes) {
        entries.push({
          destination: r.destination,
          nextHop: r.nextHop,
          metric: r.metric ?? 0,
          protocol: 'static',
          adminDistance: this.adminDistance,
          nodeId: node.id,
        });
      }

      const staticRoutes6 = node.data.staticRoutes6 ?? [];
      for (const r of staticRoutes6) {
        entries.push({
          af: 'v6',
          destination: r.destination,
          nextHop: r.nextHop,
          metric: r.metric ?? 0,
          protocol: 'static',
          adminDistance: this.adminDistance,
          nodeId: node.id,
        });
      }
    }

    return installEqualCostNextHops(entries);
  }
}

export const staticProtocol = new StaticProtocol();
