import type { RouteEntry } from '../../src/types/routing';

/**
 * Every next hop a route is installed with: the equal-cost set when the
 * protocol found more than one path, otherwise its single next hop.
 */
export function routeNextHops(
  route: Pick<RouteEntry, 'nextHop' | 'equalCostNextHops'>,
): readonly string[] {
  const hops = route.equalCostNextHops?.map((hop) => hop.nextHop) ?? [];
  return hops.length > 0 ? hops : [route.nextHop];
}
