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

type SessionType = 'local' | 'ebgp' | 'ibgp';

interface BgpRouteState {
  af: AddressFamily;
  destination: string;
  nextHop: string;
  nextHops: string[];
  attributes: BgpPathAttributes;
  sourceType: SessionType;
  advertiserRouterId: string;
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

    const interfaceOwnerByIp = new Map(
      bgpRouters.flatMap((node) =>
        (node.data.interfaces ?? []).flatMap((iface) => [
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
        });
      }

      tables.set(router.id, routeTable);
    }

    let remainingIterations = bgpRouters.length;
    while (remainingIterations > 0) {
      remainingIterations -= 1;
      const snapshot = cloneTables(tables);
      const nextTables = cloneTables(tables);
      let changed = false;

      for (const router of bgpRouters) {
        const receiverConfig = router.data.bgpConfig;
        if (!receiverConfig) continue;

        const routeTable = nextTables.get(router.id) ?? new Map<string, BgpRouteState>();

        for (const session of sessionsByRouter.get(router.id) ?? []) {
          const neighborTable = snapshot.get(session.neighborId);
          if (!neighborTable) continue;

          for (const route of neighborTable.values()) {
            if (!session.families.includes(route.af)) continue;
            const exportedAsPath =
              session.sessionType === 'ebgp'
                ? prependAs(route.attributes.asPath, session.senderLocalAs)
                : [...route.attributes.asPath];

            if (exportedAsPath.includes(receiverConfig.localAs)) continue;

            const candidate: BgpRouteState = {
              af: route.af,
              destination: route.destination,
              nextHop: session.neighborAddress,
              nextHops: [session.neighborAddress],
              attributes: {
                asPath: exportedAsPath,
                localPref: session.neighborConfig.localPref ?? route.attributes.localPref,
                med: session.neighborConfig.med ?? route.attributes.med,
                origin: route.attributes.origin,
              },
              sourceType: session.sessionType,
              advertiserRouterId: session.neighborRouterId,
            };

            const existing = routeTable.get(route.destination);
            if (!existing || compareRoutes(candidate, existing) < 0) {
              routeTable.set(route.destination, candidate);
              changed = true;
            } else if (
              (receiverConfig.maxEcmpPaths ?? 1) > 1 &&
              compareMultipath(candidate, existing) === 0 &&
              !existing.nextHops.includes(candidate.nextHop)
            ) {
              routeTable.set(route.destination, {
                ...existing,
                nextHops: [...existing.nextHops, candidate.nextHop].sort(),
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

function compareRoutes(left: BgpRouteState, right: BgpRouteState): number {
  const multipathComparison = compareMultipath(left, right);
  if (multipathComparison !== 0) {
    return multipathComparison;
  }

  return left.advertiserRouterId.localeCompare(right.advertiserRouterId);
}

function compareMultipath(left: BgpRouteState, right: BgpRouteState): number {
  if (left.attributes.localPref !== right.attributes.localPref) {
    return right.attributes.localPref - left.attributes.localPref;
  }

  if (left.attributes.asPath.length !== right.attributes.asPath.length) {
    return left.attributes.asPath.length - right.attributes.asPath.length;
  }

  if (left.attributes.med !== right.attributes.med) {
    return left.attributes.med - right.attributes.med;
  }

  if (left.sourceType !== right.sourceType) {
    return sourceRank(left.sourceType) - sourceRank(right.sourceType);
  }

  return 0;
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
