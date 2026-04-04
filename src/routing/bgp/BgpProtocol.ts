import { ADMIN_DISTANCES, type RoutingProtocol, type RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';

export class BgpProtocol implements RoutingProtocol {
  name = 'bgp' as const;
  // eBGP admin distance; iBGP would use ADMIN_DISTANCES.ibgp
  adminDistance = ADMIN_DISTANCES.ebgp;

  computeRoutes(_topology: NetworkTopology): RouteEntry[] {
    // TODO: implement BGP path-vector algorithm
    // See docs/routing/bgp.md for the planned interface
    return [];
  }
}

export const bgpProtocol = new BgpProtocol();
