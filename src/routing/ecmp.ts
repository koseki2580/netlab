import type { EqualCostNextHop, RouteEntry } from '../types/routing';
import { inferRouteAddressFamily } from './AddressFamily';

function sameRouteKey(left: RouteEntry, right: RouteEntry): boolean {
  return (
    left.nodeId === right.nodeId &&
    inferRouteAddressFamily(left) === inferRouteAddressFamily(right) &&
    left.destination === right.destination &&
    left.protocol === right.protocol &&
    left.adminDistance === right.adminDistance
  );
}

export function canonicalNextHops(
  candidates: readonly Pick<RouteEntry, 'nextHop' | 'outIfId'>[],
): EqualCostNextHop[] {
  const byNextHop = new Map<string, EqualCostNextHop>();
  for (const candidate of candidates) {
    byNextHop.set(candidate.nextHop, {
      nextHop: candidate.nextHop,
      ...(candidate.outIfId !== undefined ? { outIfId: candidate.outIfId } : {}),
    });
  }
  return [...byNextHop.values()].sort((left, right) => left.nextHop.localeCompare(right.nextHop));
}

export function withEqualCostNextHops(
  route: RouteEntry,
  candidates: readonly Pick<RouteEntry, 'nextHop' | 'outIfId'>[],
): RouteEntry {
  const equalCostNextHops = canonicalNextHops(candidates);
  const first = equalCostNextHops[0];
  return {
    ...route,
    ...(first !== undefined ? { nextHop: first.nextHop } : {}),
    ...(first?.outIfId !== undefined ? { outIfId: first.outIfId } : {}),
    ...(equalCostNextHops.length > 1 ? { equalCostNextHops } : {}),
  };
}

export function installEqualCostNextHops(routes: readonly RouteEntry[]): RouteEntry[] {
  const groups: RouteEntry[][] = [];

  for (const route of routes) {
    const group = groups.find((candidate) => {
      const first = candidate[0];
      return first !== undefined && sameRouteKey(first, route);
    });
    if (group) {
      group.push(route);
    } else {
      groups.push([route]);
    }
  }

  return groups.map((group) => {
    const lowestMetric = Math.min(...group.map((route) => route.metric));
    const winners = group.filter((route) => route.metric === lowestMetric);
    const base = [...winners].sort((left, right) => left.nextHop.localeCompare(right.nextHop))[0];
    if (!base) {
      throw new Error('ECMP route group has no candidates');
    }
    return withEqualCostNextHops(base, winners);
  });
}
