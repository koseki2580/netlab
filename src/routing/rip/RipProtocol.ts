import { ADMIN_DISTANCES, type RoutingProtocol, type RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';

export class RipProtocol implements RoutingProtocol {
  name = 'rip' as const;
  adminDistance = ADMIN_DISTANCES.rip;

  computeRoutes(_topology: NetworkTopology): RouteEntry[] {
    // TODO: implement distance-vector (Bellman-Ford) algorithm
    // See docs/routing/rip.md for the planned interface
    return [];
  }
}

export const ripProtocol = new RipProtocol();
