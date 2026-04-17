import {
  ADMIN_DISTANCES,
  type BgpNeighborConfig,
  type BgpPathAttributes,
  type RoutingProtocol,
  type RouteEntry,
} from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';

type SessionType = 'local' | 'ebgp' | 'ibgp';

interface BgpRouteState {
  destination: string;
  nextHop: string;
  attributes: BgpPathAttributes;
  sourceType: SessionType;
  advertiserRouterId: string;
}

interface BgpSession {
  neighborId: string;
  neighborAddress: string;
  neighborConfig: BgpNeighborConfig;
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
        (node.data.interfaces ?? []).map((iface) => [iface.ipAddress, node] as const),
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

        sessions.push({
          neighborId: peerRouter.id,
          neighborAddress: neighbor.address,
          neighborConfig: neighbor,
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
        routeTable.set(network, {
          destination: network,
          nextHop: 'direct',
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

    for (let iteration = 0; iteration < bgpRouters.length; iteration += 1) {
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
            const exportedAsPath =
              session.sessionType === 'ebgp'
                ? prependAs(route.attributes.asPath, session.senderLocalAs)
                : [...route.attributes.asPath];

            if (exportedAsPath.includes(receiverConfig.localAs)) continue;

            const candidate: BgpRouteState = {
              destination: route.destination,
              nextHop: session.neighborAddress,
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
          metric: route.attributes.asPath.length,
          protocol: 'bgp',
          adminDistance:
            route.sourceType === 'ibgp' ? ADMIN_DISTANCES.ibgp : ADMIN_DISTANCES.ebgp,
          nodeId,
        })),
      )
      .sort((left, right) =>
        left.nodeId.localeCompare(right.nodeId) || left.destination.localeCompare(right.destination),
      );
  }
}

export const bgpProtocol = new BgpProtocol();

function prependAs(asPath: number[], localAs: number): number[] {
  return asPath[0] === localAs ? [...asPath] : [localAs, ...asPath];
}

function sourceRank(sourceType: SessionType): number {
  if (sourceType === 'local') return 0;
  if (sourceType === 'ebgp') return 1;
  return 2;
}

function compareRoutes(left: BgpRouteState, right: BgpRouteState): number {
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

  return left.advertiserRouterId.localeCompare(right.advertiserRouterId);
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
