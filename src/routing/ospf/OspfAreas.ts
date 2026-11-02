/**
 * OSPF area by area (RFC 2328): SPF inside each area, ABRs summarising between
 * areas through the backbone, ASBRs bringing in external networks, and the
 * calculation the link-state database (`OspfLsdb.ts`) is read from.
 *
 * All of it is calculated from the topology. No OSPF packet is sent, so nothing
 * here is learned over time: the database is what flooding would have settled on.
 * Not modelled: Type 4 LSAs (the way to an ASBR is worked out directly), stub
 * areas, virtual links, and the discard route an ABR keeps for a range.
 */

import type { OspfPathType, RouteEntry, RouterInterface } from '../../types/routing';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../../types/topology';
import { ipToInt, isInSubnet } from '../../utils/cidr';
import { withEqualCostNextHops } from '../ecmp';
import { buildRouterAdjacency, isInterfaceOnDownLink, type RouterAdjacency } from '../graphBuilder';
import { ospfInterfaceCost, runSpf, toNetworkCidr, type SpfState } from './spf';

export const BACKBONE = '0.0.0.0';

/** Area 1 and 0.0.0.1 are one area. */
export function normaliseAreaId(areaId: string): string {
  if (!/^\d+$/.test(areaId)) return areaId;
  const value = Number(areaId);
  return [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join('.');
}

export const ospfRouters = (topology: NetworkTopology) =>
  topology.nodes.filter((node) => node.data.role === 'router' && node.data.ospfConfig);

/** Whether the topology needs areas at all: more than one, or an external network. */
export function isAreaAware(topology: NetworkTopology): boolean {
  const routers = ospfRouters(topology);
  const areas = new Set(
    routers.flatMap((node) =>
      (node.data.ospfConfig?.areas ?? []).map((area) => normaliseAreaId(area.areaId)),
    ),
  );
  return (
    areas.size > 1 || routers.some((node) => (node.data.ospfConfig?.externals ?? []).length > 0)
  );
}

// --- Multi-access segments -------------------------------------------------------

/** The area `node` puts `network` in, if any. */
export function areaOfNetwork(node: NetlabNode, network: string): string | null {
  const area = node.data.ospfConfig?.areas.find((entry) => entry.networks.includes(network));
  return area ? normaliseAreaId(area.areaId) : null;
}

/** Each switch's island: switches joined by cables that are up. */
function switchIslands(topology: NetworkTopology): Map<string, string> {
  const switches = topology.nodes.filter((node) => node.data.role === 'switch');
  const island = new Map(switches.map((node) => [node.id, node.id]));
  const find = (id: string): string => {
    const parent = island.get(id) ?? id;
    return parent === id ? id : find(parent);
  };
  for (const edge of topology.edges) {
    if (edge.data?.state === 'down' || !island.has(edge.source) || !island.has(edge.target)) {
      continue;
    }
    island.set(find(edge.source), find(edge.target));
  }
  return new Map(switches.map((node) => [node.id, find(node.id)]));
}

function ifaceOnEdge(node: NetlabNode, edge: NetlabEdge): RouterInterface | undefined {
  const handle = edge.source === node.id ? edge.sourceHandle : edge.targetHandle;
  return (node.data.interfaces ?? []).find(
    (iface) => iface.id === handle || iface.connectedEdgeId === edge.id,
  );
}

/** Routers on one subnet through switches: two or more, in one area. */
export function multiAccessGroups(
  topology: NetworkTopology,
): { network: string; areaId: string; members: { node: NetlabNode; iface: RouterInterface }[] }[] {
  const islands = switchIslands(topology);
  const routers = new Map(ospfRouters(topology).map((node) => [node.id, node]));
  const groups = new Map<
    string,
    { network: string; areaId: string; members: { node: NetlabNode; iface: RouterInterface }[] }
  >();

  for (const edge of topology.edges) {
    if (edge.data?.state === 'down') continue;
    const [routerEnd, switchEnd] = islands.has(edge.target)
      ? [edge.source, edge.target]
      : [edge.target, edge.source];
    const node = routers.get(routerEnd);
    const island = islands.get(switchEnd);
    if (!node || !island) continue;
    const iface = ifaceOnEdge(node, edge);
    if (!iface) continue;
    const network = toNetworkCidr(iface);
    const areaId = areaOfNetwork(node, network);
    if (!areaId) continue;
    const key = `${island}|${network}|${areaId}`;
    const group = groups.get(key) ?? { network, areaId, members: [] };
    group.members.push({ node, iface });
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.members.length >= 2);
}

// --- Each area's graph -----------------------------------------------------------

export interface AreaModel {
  readonly areaId: string;
  readonly routers: readonly NetlabNode[];
  /** Each router's networks in this area, with the cost of its interface onto them. */
  readonly networks: ReadonlyMap<string, ReadonlyMap<string, number>>;
  readonly adjacency: ReadonlyMap<string, RouterAdjacency[]>;
  /** SPF from each router of the area. */
  readonly spf: ReadonlyMap<string, ReadonlyMap<string, SpfState>>;
}

export function modelAreas(topology: NetworkTopology): AreaModel[] {
  const routers = ospfRouters(topology);
  const areaIds = new Set(
    routers.flatMap((node) =>
      (node.data.ospfConfig?.areas ?? []).map((area) => normaliseAreaId(area.areaId)),
    ),
  );
  const direct = buildRouterAdjacency(topology);
  const groups = multiAccessGroups(topology);
  const inArea = (node: NetlabNode, iface: RouterInterface, areaId: string) =>
    areaOfNetwork(node, toNetworkCidr(iface)) === areaId;

  return [...areaIds].sort(compareAreas).map((areaId) => {
    const networks = new Map<string, Map<string, number>>();
    for (const node of routers) {
      const own = new Map<string, number>();
      for (const iface of node.data.interfaces ?? []) {
        if (isInterfaceOnDownLink(topology, node.id, iface)) continue;
        for (const addressed of [iface, ...(iface.subInterfaces ?? [])]) {
          const network = toNetworkCidr(addressed);
          if (areaOfNetwork(node, network) === areaId && !own.has(network)) {
            own.set(network, ospfInterfaceCost(node, addressed as RouterInterface));
          }
        }
      }
      if (own.size > 0) networks.set(node.id, own);
    }
    const members = routers.filter((node) => networks.has(node.id));
    const byId = new Map(members.map((node) => [node.id, node]));

    const adjacency = new Map<string, RouterAdjacency[]>();
    for (const node of members) {
      const links = (direct.get(node.id) ?? []).filter((link) => {
        const neighbour = byId.get(link.neighborId);
        return (
          neighbour !== undefined &&
          inArea(node, link.localIface, areaId) &&
          inArea(neighbour, link.neighborIface, areaId)
        );
      });
      for (const group of groups) {
        if (group.areaId !== areaId) continue;
        const self = group.members.find((member) => member.node.id === node.id);
        if (!self) continue;
        for (const other of group.members) {
          if (other.node.id === node.id) continue;
          links.push({
            neighborId: other.node.id,
            edgeId: group.network,
            localIface: self.iface,
            neighborIface: other.iface,
            cost: 1,
          });
        }
      }
      adjacency.set(node.id, links);
    }

    const ids = new Set(byId.keys());
    const spf = new Map(
      members.map((node) => [
        node.id,
        runSpf(node, adjacency as Map<string, RouterAdjacency[]>, byId, ids),
      ]),
    );
    return { areaId, routers: members, networks, adjacency, spf };
  });
}

export const compareNumeric = (left: string, right: string) => ipToInt(left) - ipToInt(right);
const compareAreas = compareNumeric;
export const compareCidr = (left: string, right: string) =>
  compareNumeric(left.split('/')[0] ?? '', right.split('/')[0] ?? '') || left.localeCompare(right);

interface Reach {
  cost: number;
  nextHops: string[];
  direct: boolean;
}

/** The networks of `area` as `nodeId` sees them inside it. */
function intraRoutes(area: AreaModel, nodeId: string): Map<string, Reach> {
  const reach = new Map<string, Reach>();
  for (const [network, cost] of area.networks.get(nodeId) ?? []) {
    reach.set(network, { cost, nextHops: [], direct: true });
  }
  for (const [targetId, state] of area.spf.get(nodeId) ?? []) {
    if (targetId === nodeId || state.nextHops.length === 0) continue;
    for (const [network, stubCost] of area.networks.get(targetId) ?? []) {
      merge(reach, network, {
        cost: state.distance + stubCost,
        nextHops: state.nextHops,
        direct: false,
      });
    }
  }
  return reach;
}

/** Keep the cheaper of two ways; equal ways share the load. A direct network stays direct. */
function merge(table: Map<string, Reach>, network: string, offer: Reach): void {
  const existing = table.get(network);
  if (existing?.direct) return;
  if (!existing || offer.direct || offer.cost < existing.cost) {
    table.set(network, offer);
    return;
  }
  if (offer.cost === existing.cost) {
    existing.nextHops = [...new Set([...existing.nextHops, ...offer.nextHops])].sort();
  }
}

export function isAbr(areas: readonly AreaModel[], nodeId: string): boolean {
  const attached = areas.filter((area) => area.networks.has(nodeId));
  return attached.length >= 2 && attached.some((area) => area.areaId === BACKBONE);
}

// --- Summaries (Type 3) ----------------------------------------------------------

interface Summary {
  readonly network: string;
  readonly abr: NetlabNode;
  readonly cost: number;
}

function rangesOf(node: NetlabNode, areaId: string): string[] {
  return (node.data.ospfConfig?.areas ?? [])
    .filter((area) => normaliseAreaId(area.areaId) === areaId)
    .flatMap((area) => area.ranges ?? []);
}

/** What `abr` says of `source`'s networks: each one, or its range at the costliest part's cost. */
function summariseArea(source: AreaModel, abr: NetlabNode): Map<string, number> {
  const ranges = rangesOf(abr, source.areaId);
  const said = new Map<string, number>();
  for (const [network, reach] of intraRoutes(source, abr.id)) {
    const [address = ''] = network.split('/');
    const range = ranges.find((entry) => isInSubnet(address, entry));
    if (range) {
      said.set(range, Math.max(said.get(range) ?? 0, reach.cost));
    } else {
      said.set(network, reach.cost);
    }
  }
  return said;
}

/**
 * RFC 2328 §12.4.3: into the backbone go each area's own networks; into the
 * other areas go the backbone's, and what the backbone has learned. A network
 * the receiving area already holds is not summarised back into it.
 */
export function summariesByArea(areas: readonly AreaModel[]): Map<string, Summary[]> {
  const summaries = new Map<string, Summary[]>(areas.map((area) => [area.areaId, []]));
  const backbone = areas.find((area) => area.areaId === BACKBONE);
  if (!backbone) return summaries;

  const abrs = backbone.routers.filter((node) => isAbr(areas, node.id));
  const others = areas.filter((area) => area.areaId !== BACKBONE);
  const holds = (area: AreaModel, network: string) =>
    [...area.networks.values()].some((own) => own.has(network));

  for (const abr of abrs) {
    for (const source of others.filter((area) => area.networks.has(abr.id))) {
      for (const [network, cost] of summariseArea(source, abr)) {
        if (!holds(backbone, network)) summaries.get(BACKBONE)?.push({ network, abr, cost });
      }
    }
  }

  for (const abr of abrs) {
    const fromBackbone = summariseArea(backbone, abr);
    for (const entry of summaries.get(BACKBONE) ?? []) {
      if (entry.abr.id === abr.id) continue;
      const toOther = backbone.spf.get(abr.id)?.get(entry.abr.id);
      if (!toOther || toOther.nextHops.length === 0) continue;
      const cost = toOther.distance + entry.cost;
      fromBackbone.set(entry.network, Math.min(fromBackbone.get(entry.network) ?? cost, cost));
    }
    for (const target of others.filter((area) => area.networks.has(abr.id))) {
      const said = new Map(fromBackbone);
      for (const source of others) {
        if (source === target || !source.networks.has(abr.id)) continue;
        for (const [network, cost] of summariseArea(source, abr)) {
          said.set(network, Math.min(said.get(network) ?? cost, cost));
        }
      }
      for (const [network, cost] of said) {
        if (!holds(target, network)) summaries.get(target.areaId)?.push({ network, abr, cost });
      }
    }
  }
  return summaries;
}

// --- Routes ----------------------------------------------------------------------

/** The cheapest way from `nodeId` to router `targetId`, across areas if it must be. */
function wayToRouter(
  areas: readonly AreaModel[],
  nodeId: string,
  targetId: string,
  visited: ReadonlySet<string> = new Set(),
): { cost: number; nextHops: string[] } | null {
  const attached = areas.filter((area) => area.networks.has(nodeId));
  let best: { cost: number; nextHops: string[] } | null = null;
  const offer = (cost: number, nextHops: readonly string[]) => {
    if (!best || cost < best.cost) best = { cost, nextHops: [...nextHops] };
  };
  for (const area of attached) {
    const local = area.spf.get(nodeId);
    const direct = local?.get(targetId);
    if (direct && direct.nextHops.length > 0) offer(direct.distance, direct.nextHops);
  }
  if (best) return best;
  const seen = new Set([...visited, nodeId]);
  const through = isAbr(areas, nodeId)
    ? attached.filter((area) => area.areaId === BACKBONE)
    : attached;
  for (const area of through) {
    for (const abr of area.routers) {
      if (seen.has(abr.id) || !isAbr(areas, abr.id)) continue;
      const leg = area.spf.get(nodeId)?.get(abr.id);
      if (!leg || leg.nextHops.length === 0) continue;
      const rest = wayToRouter(areas, abr.id, targetId, seen);
      if (rest) offer(leg.distance + rest.cost, leg.nextHops);
    }
  }
  return best;
}

interface External {
  metric: number;
  type: 1 | 2;
  forward: number;
  nextHops: string[];
}

function chooseExternal(existing: External | undefined, offer: External): External {
  if (!existing) return offer;
  if (offer.type !== existing.type) return offer.type < existing.type ? offer : existing;
  const rank = (entry: External) => [entry.metric, entry.forward];
  const [offerMetric = 0, offerForward = 0] = rank(offer);
  const [metric = 0, forward = 0] = rank(existing);
  if (offerMetric !== metric) return offerMetric < metric ? offer : existing;
  if (offerForward !== forward) return offerForward < forward ? offer : existing;
  return {
    ...existing,
    nextHops: [...new Set([...existing.nextHops, ...offer.nextHops])].sort(),
  };
}

export function computeAreaRoutes(topology: NetworkTopology, adminDistance: number): RouteEntry[] {
  const areas = modelAreas(topology);
  const summaries = summariesByArea(areas);
  const routers = ospfRouters(topology);
  const routes: RouteEntry[] = [];

  for (const router of routers) {
    const attached = areas.filter((area) => area.networks.has(router.id));
    const intra = new Map<string, Reach>();
    for (const area of attached) {
      for (const [network, reach] of intraRoutes(area, router.id)) merge(intra, network, reach);
    }

    // §16.2: an ABR looks only at the backbone's summaries.
    const inter = new Map<string, Reach>();
    const examined = isAbr(areas, router.id)
      ? attached.filter((area) => area.areaId === BACKBONE)
      : attached;
    for (const area of examined) {
      for (const summary of summaries.get(area.areaId) ?? []) {
        if (summary.abr.id === router.id || intra.has(summary.network)) continue;
        const way = area.spf.get(router.id)?.get(summary.abr.id);
        if (!way || way.nextHops.length === 0) continue;
        merge(inter, summary.network, {
          cost: way.distance + summary.cost,
          nextHops: way.nextHops,
          direct: false,
        });
      }
    }

    const externals = new Map<string, External>();
    for (const asbr of routers) {
      if (asbr.id === router.id) continue;
      for (const external of asbr.data.ospfConfig?.externals ?? []) {
        if (intra.has(external.network) || inter.has(external.network)) continue;
        const way = wayToRouter(areas, router.id, asbr.id);
        if (!way) continue;
        const type = external.metricType ?? 2;
        externals.set(
          external.network,
          chooseExternal(externals.get(external.network), {
            metric: type === 1 ? way.cost + external.metric : external.metric,
            type,
            forward: way.cost,
            nextHops: way.nextHops,
          }),
        );
      }
    }

    const emit = (
      network: string,
      metric: number,
      nextHops: readonly string[],
      ospfPathType: OspfPathType,
    ) =>
      routes.push(
        withEqualCostNextHops(
          {
            destination: network,
            nextHop: nextHops[0] ?? 'direct',
            metric,
            protocol: 'ospf',
            adminDistance,
            nodeId: router.id,
            ospfPathType,
          },
          nextHops.map((nextHop) => ({ nextHop })),
        ),
      );

    for (const [network, reach] of intra) {
      emit(network, reach.direct ? 0 : reach.cost, reach.nextHops, 'intra-area');
    }
    for (const [network, reach] of inter) emit(network, reach.cost, reach.nextHops, 'inter-area');
    for (const [network, entry] of externals) {
      emit(network, entry.metric, entry.nextHops, entry.type === 1 ? 'external-1' : 'external-2');
    }
  }

  return routes.sort(
    (left, right) =>
      left.nodeId.localeCompare(right.nodeId) || left.destination.localeCompare(right.destination),
  );
}
