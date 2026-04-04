import { ADMIN_DISTANCES, type RoutingProtocol, type RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';

export class OspfProtocol implements RoutingProtocol {
  name = 'ospf' as const;
  adminDistance = ADMIN_DISTANCES.ospf;

  computeRoutes(_topology: NetworkTopology): RouteEntry[] {
    // TODO: implement SPF (Dijkstra) over topology graph
    // See docs/routing/ospf.md for the planned interface
    return [];
  }
}

export const ospfProtocol = new OspfProtocol();
