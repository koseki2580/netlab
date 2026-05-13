import {
  ADMIN_DISTANCES,
  type RouteEntry,
  type RouterInterface,
  type RoutingProtocol,
} from '../../types/routing';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { isInSubnet } from '../../utils/cidr';
import { prefixLength6 } from '../../utils/ipv6';
import { withEqualCostNextHops } from '../ecmp';

interface SpfState {
  distance: number;
  nextHops: string[];
}

export interface OspfV3Hello {
  version: 3;
  type: 'hello';
  destination: 'ff02::5';
  routerId: string;
  areaId: string;
  instanceId: number;
}

export interface OspfV3LinkLsa {
  kind: 'link-lsa';
  lsaType: 8;
  routerPriority: number;
  options: number;
  linkLocalAddress: string;
  prefixCount: number;
  prefixes: readonly { length: number; options: number; prefix: string }[];
}

export interface OspfV3IntraAreaPrefixLsa {
  kind: 'intra-area-prefix-lsa';
  lsaType: 9;
  referencedLsType: 0x2001 | 0x2002;
  referencedLinkStateId: number;
  referencedAdvertisingRouter: string;
  prefixes: readonly { length: number; options: number; metric: number; prefix: string }[];
}

interface V6Adjacency {
  neighborId: string;
  localIface: RouterInterface;
  neighborIface: RouterInterface;
}

export function buildOspfV3Hello(options: {
  routerId: string;
  areaId: string;
  instanceId?: number;
}): OspfV3Hello {
  return {
    version: 3,
    type: 'hello',
    destination: 'ff02::5',
    routerId: options.routerId,
    areaId: options.areaId,
    instanceId: options.instanceId ?? 0,
  };
}

export function buildOspfV3LinkLsa(options: {
  linkLocalAddress: string;
  prefixes: readonly { prefix: string; length: number; options?: number }[];
  routerPriority?: number;
  options?: number;
}): OspfV3LinkLsa {
  return {
    kind: 'link-lsa',
    lsaType: 8,
    routerPriority: options.routerPriority ?? 1,
    options: options.options ?? 0,
    linkLocalAddress: options.linkLocalAddress,
    prefixCount: options.prefixes.length,
    prefixes: options.prefixes.map((prefix) => ({
      length: prefix.length,
      options: prefix.options ?? 0,
      prefix: prefix.prefix,
    })),
  };
}

export class OspfV3Protocol implements RoutingProtocol {
  name = 'ospfv3' as const;
  adminDistance = ADMIN_DISTANCES.ospf;

  computeRoutes(topology: NetworkTopology): RouteEntry[] {
    const routers = topology.nodes.filter(
      (node) => node.data.role === 'router' && node.data.ospfv3Config,
    );
    if (routers.length === 0) return [];

    const participatingRouterIds = new Set(routers.map((node) => node.id));
    const routerById = new Map(routers.map((node) => [node.id, node]));
    const adjacency = buildIpv6Adjacency(topology, routers);
    const routes: RouteEntry[] = [];

    for (const router of routers) {
      const bestRoutes = new Map<string, RouteEntry>();
      const advertisedNetworks = getAdvertisedNetworks(router);
      const spf = runSpf(router, adjacency, routerById, participatingRouterIds);

      for (const network of advertisedNetworks) {
        bestRoutes.set(network, {
          af: 'v6',
          destination: network,
          nextHop: 'direct',
          metric: 0,
          protocol: 'ospfv3',
          adminDistance: this.adminDistance,
          nodeId: router.id,
        });
      }

      for (const [targetId, state] of spf.entries()) {
        if (targetId === router.id || state.nextHops.length === 0) continue;
        const targetRouter = routerById.get(targetId);
        if (!targetRouter) continue;

        for (const network of getAdvertisedNetworks(targetRouter)) {
          const existing = bestRoutes.get(network);
          if (existing && existing.metric < state.distance) continue;

          if (existing && existing.metric === state.distance) {
            const candidates = [
              { nextHop: existing.nextHop },
              ...(existing.equalCostNextHops ?? []),
              ...state.nextHops.map((nextHop) => ({ nextHop })),
            ];
            bestRoutes.set(network, withEqualCostNextHops(existing, candidates));
            continue;
          }

          const route: RouteEntry = {
            af: 'v6',
            destination: network,
            nextHop: state.nextHops[0] ?? 'direct',
            metric: state.distance,
            protocol: 'ospfv3',
            adminDistance: this.adminDistance,
            nodeId: router.id,
          };
          bestRoutes.set(
            network,
            withEqualCostNextHops(
              route,
              state.nextHops.map((nextHop) => ({ nextHop })),
            ),
          );
        }
      }

      routes.push(...bestRoutes.values());
    }

    return routes.sort(
      (left, right) =>
        left.nodeId.localeCompare(right.nodeId) ||
        left.destination.localeCompare(right.destination),
    );
  }
}

export const ospfV3Protocol = new OspfV3Protocol();

function buildIpv6Adjacency(
  topology: NetworkTopology,
  routers: readonly NetlabNode[],
): Map<string, V6Adjacency[]> {
  const nodeById = new Map(routers.map((node) => [node.id, node]));
  const adjacency = new Map<string, V6Adjacency[]>();
  for (const router of routers) adjacency.set(router.id, []);

  for (const edge of topology.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;

    const sourceIface =
      findInterface(source, edge.sourceHandle) ?? findPeerByIpv6Subnet(source, target);
    const targetIface =
      findInterface(target, edge.targetHandle) ?? findPeerByIpv6Subnet(target, source);
    if (!sourceIface || !targetIface) continue;
    if (!interfacesShareIpv6Subnet(sourceIface, targetIface)) continue;

    adjacency
      .get(source.id)
      ?.push({ neighborId: target.id, localIface: sourceIface, neighborIface: targetIface });
    adjacency
      .get(target.id)
      ?.push({ neighborId: source.id, localIface: targetIface, neighborIface: sourceIface });
  }

  return adjacency;
}

function findInterface(node: NetlabNode, id: string | null | undefined): RouterInterface | null {
  if (!id) return null;
  return (node.data.interfaces ?? []).find((iface) => iface.id === id) ?? null;
}

function findPeerByIpv6Subnet(localNode: NetlabNode, peerNode: NetlabNode): RouterInterface | null {
  for (const localIface of localNode.data.interfaces ?? []) {
    if (
      (peerNode.data.interfaces ?? []).some((peerIface) =>
        interfacesShareIpv6Subnet(localIface, peerIface),
      )
    ) {
      return localIface;
    }
  }
  return null;
}

function interfacesShareIpv6Subnet(left: RouterInterface, right: RouterInterface): boolean {
  if (!left.ipv6Address || left.prefixLength6 === undefined) return false;
  if (!right.ipv6Address || right.prefixLength6 === undefined) return false;
  return (
    isInSubnet(right.ipv6Address, `${left.ipv6Address}/${left.prefixLength6}`) &&
    isInSubnet(left.ipv6Address, `${right.ipv6Address}/${right.prefixLength6}`)
  );
}

function getAdvertisedNetworks(node: NetlabNode): string[] {
  const configuredNetworks = new Set(
    node.data.ospfv3Config?.areas.flatMap((area) => area.networks) ?? [],
  );
  const networks: string[] = [];
  const seen = new Set<string>();

  for (const iface of node.data.interfaces ?? []) {
    if (!iface.ipv6Address || iface.prefixLength6 === undefined) continue;
    const network = `${iface.ipv6Address}/${iface.prefixLength6}`;
    const cidr = configuredNetworks.has(network)
      ? network
      : Array.from(configuredNetworks).find((candidate) =>
          isInSubnet(iface.ipv6Address!, candidate),
        );
    if (!cidr || seen.has(cidr)) continue;
    prefixLength6(cidr);
    seen.add(cidr);
    networks.push(cidr);
  }

  return networks;
}

function resolveLinkCost(node: NetlabNode, iface: RouterInterface): number {
  const address = iface.ipv6Address;
  if (!address) return 1;
  for (const area of node.data.ospfv3Config?.areas ?? []) {
    if (area.networks.some((network) => isInSubnet(address, network))) {
      return area.cost ?? 1;
    }
  }
  return 1;
}

function runSpf(
  source: NetlabNode,
  adjacency: Map<string, V6Adjacency[]>,
  routerById: Map<string, NetlabNode>,
  participatingRouterIds: Set<string>,
): Map<string, SpfState> {
  const states = new Map<string, SpfState>([[source.id, { distance: 0, nextHops: [] }]]);
  const queue: { nodeId: string; distance: number }[] = [{ nodeId: source.id, distance: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    queue.sort(
      (left, right) => left.distance - right.distance || left.nodeId.localeCompare(right.nodeId),
    );
    const current = queue.shift();
    if (!current || visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    const currentNode = routerById.get(current.nodeId);
    const currentState = states.get(current.nodeId);
    if (!currentNode || !currentState) continue;

    for (const neighbor of adjacency.get(current.nodeId) ?? []) {
      if (!participatingRouterIds.has(neighbor.neighborId)) continue;
      const nextHop =
        current.nodeId === source.id
          ? neighbor.neighborIface.ipv6Address
          : currentState.nextHops[0];
      if (!nextHop) continue;
      const newDistance = currentState.distance + resolveLinkCost(currentNode, neighbor.localIface);
      const existing = states.get(neighbor.neighborId);

      if (!existing || newDistance < existing.distance) {
        states.set(neighbor.neighborId, { distance: newDistance, nextHops: [nextHop] });
        queue.push({ nodeId: neighbor.neighborId, distance: newDistance });
        continue;
      }

      if (newDistance === existing.distance && !existing.nextHops.includes(nextHop)) {
        states.set(neighbor.neighborId, {
          distance: existing.distance,
          nextHops: [...existing.nextHops, nextHop].sort(),
        });
        queue.push({ nodeId: neighbor.neighborId, distance: newDistance });
      }
    }
  }

  return states;
}
