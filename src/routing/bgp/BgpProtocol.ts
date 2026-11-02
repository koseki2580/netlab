import {
  ADMIN_DISTANCES,
  type BgpNeighborConfig,
  type BgpPathAttributes,
  type RoutingProtocol,
  type RouteEntry,
} from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { inferRouteAddressFamily, type AddressFamily } from '../AddressFamily';
import { withEqualCostNextHops } from '../ecmp';
import { isInterfaceOnDownLink } from '../graphBuilder';
import { ipToInt } from '../../utils/cidr';
import { isIpv6Address, parseIpv6 } from '../../utils/ipv6';

type SessionType = 'local' | 'ebgp' | 'ibgp';

interface BgpRouteState {
  af: AddressFamily;
  destination: string;
  nextHop: string;
  nextHops: string[];
  attributes: BgpPathAttributes;
  sourceType: SessionType;
  advertiserRouterId: string;
  /** The address of the peer the route was learned from; null for a router's own network. */
  peerAddress: string | null;
}

interface BgpSession {
  neighborId: string;
  neighborAddress: string;
  neighborConfig: BgpNeighborConfig;
  families: AddressFamily[];
  sessionType: 'ebgp' | 'ibgp';
  neighborRouterId: string;
  senderLocalAs: number;
}

export class BgpProtocol implements RoutingProtocol {
  name = 'bgp' as const;
  // eBGP admin distance; iBGP would use ADMIN_DISTANCES.ibgp
  adminDistance = ADMIN_DISTANCES.ebgp;

  computeRoutes(topology: NetworkTopology): RouteEntry[] {
    const bgpRouters = topology.nodes.filter(
      (node) => node.data.role === 'router' && node.data.bgpConfig,
    );
    if (bgpRouters.length === 0) {
      return [];
    }

    // An address on a failed link is unreachable, so the session to it is
    // down and nothing is learned through it.
    const interfaceOwnerByIp = new Map(
      bgpRouters.flatMap((node) =>
        (node.data.interfaces ?? [])
          .filter((iface) => !isInterfaceOnDownLink(topology, node.id, iface))
          .flatMap((iface) => [
            [iface.ipAddress, node] as const,
            ...(iface.ipv6Address !== undefined ? [[iface.ipv6Address, node] as const] : []),
          ]),
      ),
    );
    const sessionsByRouter = new Map<string, BgpSession[]>();

    for (const router of bgpRouters) {
      const bgpConfig = router.data.bgpConfig;
      if (!bgpConfig) continue;

      const sessions: BgpSession[] = [];

      for (const neighbor of bgpConfig.neighbors) {
        const peerRouter = interfaceOwnerByIp.get(neighbor.address);
        if (!peerRouter?.data.bgpConfig) continue;
        if (peerRouter.data.bgpConfig.localAs !== neighbor.remoteAs) continue;

        const families = intersectFamilies(
          neighbor.families ?? [inferNeighborFamily(neighbor.address)],
          reciprocalFamilies(peerRouter.data.bgpConfig.neighbors, router),
        );
        if (families.length === 0) continue;

        sessions.push({
          neighborId: peerRouter.id,
          neighborAddress: neighbor.address,
          neighborConfig: neighbor,
          families,
          sessionType: bgpConfig.localAs === neighbor.remoteAs ? 'ibgp' : 'ebgp',
          neighborRouterId: peerRouter.data.bgpConfig.routerId,
          senderLocalAs: peerRouter.data.bgpConfig.localAs,
        });
      }

      sessionsByRouter.set(router.id, sessions);
    }

    let tables = new Map<string, Map<string, BgpRouteState>>();

    for (const router of bgpRouters) {
      const bgpConfig = router.data.bgpConfig;
      if (!bgpConfig) continue;

      const routeTable = new Map<string, BgpRouteState>();

      for (const network of bgpConfig.networks) {
        const af = inferRouteAddressFamily({ destination: network });
        routeTable.set(network, {
          af,
          destination: network,
          nextHop: 'direct',
          nextHops: ['direct'],
          attributes: {
            asPath: [],
            localPref: 100,
            med: 0,
            origin: 'igp',
          },
          sourceType: 'local',
          advertiserRouterId: bgpConfig.routerId,
          peerAddress: null,
        });
      }

      tables.set(router.id, routeTable);
    }

    // Each round, every router decides afresh among its own networks and all
    // that its peers now offer, so the choice never depends on arrival order.
    const originated = cloneTables(tables);
    let remainingIterations = bgpRouters.length;
    while (remainingIterations > 0) {
      remainingIterations -= 1;
      const snapshot = tables;
      const nextTables = new Map<string, Map<string, BgpRouteState>>();
      let changed = false;

      for (const router of bgpRouters) {
        const receiverConfig = router.data.bgpConfig;
        if (!receiverConfig) continue;

        const candidates = new Map<string, BgpRouteState[]>();
        const offer = (route: BgpRouteState) => {
          candidates.set(route.destination, [...(candidates.get(route.destination) ?? []), route]);
        };
        for (const route of originated.get(router.id)?.values() ?? []) offer(route);

        for (const session of sessionsByRouter.get(router.id) ?? []) {
          for (const route of snapshot.get(session.neighborId)?.values() ?? []) {
            if (!session.families.includes(route.af)) continue;
            // RFC 4271 §9.2: what a router learned over iBGP it does not pass
            // on over iBGP.
            if (session.sessionType === 'ibgp' && route.sourceType === 'ibgp') continue;
            const exportedAsPath =
              session.sessionType === 'ebgp'
                ? prependAs(route.attributes.asPath, session.senderLocalAs)
                : [...route.attributes.asPath];

            if (exportedAsPath.includes(receiverConfig.localAs)) continue;

            offer({
              af: route.af,
              destination: route.destination,
              nextHop: session.neighborAddress,
              nextHops: [session.neighborAddress],
              attributes: {
                asPath: exportedAsPath,
                // LOCAL_PREF never leaves its AS: over eBGP the receiver starts
                // from the default unless its own policy for this neighbour sets one.
                localPref:
                  session.neighborConfig.localPref ??
                  (session.sessionType === 'ebgp' ? 100 : route.attributes.localPref),
                // MED is for the neighbouring AS alone (RFC 4271 §5.1.4): kept
                // inside an AS, not carried to the next one.
                med:
                  session.neighborConfig.med ??
                  (session.sessionType === 'ibgp' ? route.attributes.med : 0),
                origin: session.neighborConfig.origin ?? route.attributes.origin,
              },
              sourceType: session.sessionType,
              advertiserRouterId: session.neighborRouterId,
              peerAddress: session.neighborAddress,
            });
          }
        }

        const previous = snapshot.get(router.id);
        const routeTable = new Map<string, BgpRouteState>();
        for (const [destination, routes] of candidates) {
          const best = decide(routes, receiverConfig.maxEcmpPaths ?? 1);
          routeTable.set(destination, best);
          const before = previous?.get(destination);
          if (!before || !sameDecision(before, best)) changed = true;
        }
        if ((previous?.size ?? 0) !== routeTable.size) changed = true;

        nextTables.set(router.id, routeTable);
      }

      tables = nextTables;
      if (!changed) break;
    }

    return Array.from(tables.entries())
      .flatMap(([nodeId, routeTable]) =>
        Array.from(routeTable.values()).map<RouteEntry>((route) => {
          const maxEcmpPaths =
            bgpRouters.find((router) => router.id === nodeId)?.data.bgpConfig?.maxEcmpPaths ?? 1;
          const nextHops = route.nextHops.slice(0, Math.max(1, maxEcmpPaths));
          return withEqualCostNextHops(
            {
              destination: route.destination,
              af: route.af,
              nextHop: nextHops[0] ?? route.nextHop,
              metric: route.attributes.asPath.length,
              protocol: 'bgp',
              adminDistance:
                route.sourceType === 'ibgp' ? ADMIN_DISTANCES.ibgp : ADMIN_DISTANCES.ebgp,
              nodeId,
            },
            nextHops.map((nextHop) => ({ nextHop })),
          );
        }),
      )
      .sort(
        (left, right) =>
          left.nodeId.localeCompare(right.nodeId) ||
          left.destination.localeCompare(right.destination),
      );
  }
}

export const bgpProtocol = new BgpProtocol();

function prependAs(asPath: number[], localAs: number): number[] {
  return asPath[0] === localAs ? [...asPath] : [localAs, ...asPath];
}

function inferNeighborFamily(address: string): AddressFamily {
  return address.includes(':') ? 'v6' : 'v4';
}

function reciprocalFamilies(
  neighbors: readonly BgpNeighborConfig[],
  router: NetworkTopology['nodes'][number],
): AddressFamily[] {
  const addresses = new Set(
    (router.data.interfaces ?? []).flatMap((iface) => [
      iface.ipAddress,
      ...(iface.ipv6Address !== undefined ? [iface.ipv6Address] : []),
    ]),
  );
  const reciprocal = neighbors.find((neighbor) => addresses.has(neighbor.address));
  return reciprocal?.families ?? (reciprocal ? [inferNeighborFamily(reciprocal.address)] : []);
}

function intersectFamilies(
  left: readonly AddressFamily[],
  right: readonly AddressFamily[],
): AddressFamily[] {
  return left.filter((family, index) => left.indexOf(family) === index && right.includes(family));
}

function sourceRank(sourceType: SessionType): number {
  if (sourceType === 'local') return 0;
  if (sourceType === 'ebgp') return 1;
  return 2;
}

const ORIGIN_RANK: Readonly<Record<BgpPathAttributes['origin'], number>> = {
  igp: 0,
  egp: 1,
  incomplete: 2,
};

/** The routes with the lowest `rank`. */
function lowest(routes: readonly BgpRouteState[], rank: (route: BgpRouteState) => number) {
  const least = Math.min(...routes.map(rank));
  return routes.filter((route) => rank(route) === least);
}

/** The AS a route came from: the first of its AS_PATH; '' for one from inside this AS. */
function neighbouringAs(route: BgpRouteState): number | '' {
  return route.attributes.asPath[0] ?? '';
}

/**
 * RFC 4271 §9.1.2.2(c): a route goes if another from the same neighbouring AS
 * has a lower MED. It is done to the whole set at once, because taken two at a
 * time MED is not transitive and the answer would depend on the order.
 */
function withLowestMedPerNeighbouringAs(routes: readonly BgpRouteState[]): BgpRouteState[] {
  return routes.filter(
    (route) =>
      !routes.some(
        (other) =>
          neighbouringAs(other) === neighbouringAs(route) &&
          other.attributes.med < route.attributes.med,
      ),
  );
}

/** Numbers, not text: 10.0.0.9 is below 10.0.0.10. */
function compareAddresses(left: string, right: string): number {
  const leftValue = addressValue(left);
  const rightValue = addressValue(right);
  if (leftValue === null || rightValue === null) return left.localeCompare(right);
  if (leftValue === rightValue) return 0;
  return leftValue < rightValue ? -1 : 1;
}

function addressValue(address: string): bigint | null {
  if (isIpv6Address(address)) return parseIpv6(address).bigint;
  return /^\d+\.\d+\.\d+\.\d+$/.test(address) ? BigInt(ipToInt(address) >>> 0) : null;
}

/**
 * The decision process of RFC 4271 §9.1: the highest LOCAL_PREF, then
 * §9.1.2.2's (a) AS_PATH, (b) ORIGIN, (c) MED, (d) a router's own network, then
 * eBGP, then iBGP. Step (e), the IGP cost to the next hop, is not modelled.
 * What survives (d) with the winner's MED shares the load, up to `maxEcmpPaths`.
 */
function decide(routes: readonly BgpRouteState[], maxEcmpPaths: number): BgpRouteState {
  let remaining = lowest(routes, (route) => -route.attributes.localPref);
  remaining = lowest(remaining, (route) => route.attributes.asPath.length);
  remaining = lowest(remaining, (route) => ORIGIN_RANK[route.attributes.origin]);
  remaining = withLowestMedPerNeighbouringAs(remaining);
  remaining = lowest(remaining, (route) => sourceRank(route.sourceType));

  const [best, ...others] = [...remaining].sort(
    (left, right) =>
      compareAddresses(left.advertiserRouterId, right.advertiserRouterId) ||
      compareAddresses(left.peerAddress ?? '', right.peerAddress ?? ''),
  );
  if (!best) throw new Error('decide: no routes');
  if (maxEcmpPaths <= 1) return best;
  const shared = others.filter((route) => route.attributes.med === best.attributes.med);
  if (shared.length === 0) return best;
  return {
    ...best,
    nextHops: [best.nextHop, ...shared.map((route) => route.nextHop)]
      .filter((hop, index, hops) => hops.indexOf(hop) === index)
      .sort(),
  };
}

function sameDecision(left: BgpRouteState, right: BgpRouteState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cloneTables(
  tables: Map<string, Map<string, BgpRouteState>>,
): Map<string, Map<string, BgpRouteState>> {
  return new Map(
    Array.from(tables.entries()).map(([nodeId, routeTable]) => [
      nodeId,
      new Map(
        Array.from(routeTable.entries()).map(([destination, route]) => [
          destination,
          {
            ...route,
            af: route.af,
            nextHops: [...route.nextHops],
            attributes: {
              ...route.attributes,
              asPath: [...route.attributes.asPath],
            },
          },
        ]),
      ),
    ]),
  );
}
