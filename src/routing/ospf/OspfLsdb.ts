/**
 * The link-state database each router would hold, and the DR and BDR of each
 * LAN. Routes do not depend on it, so it stays out of the routing core: only
 * the lessons and the exercises read it.
 *
 * It is calculated from the topology, not exchanged: what flooding would settle on.
 */

import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { isInterfaceOnDownLink } from '../graphBuilder';
import {
  areaOfNetwork,
  compareCidr,
  compareNumeric,
  isAbr,
  modelAreas,
  multiAccessGroups,
  ospfRouters,
  summariesByArea,
  type AreaModel,
} from './OspfAreas';
import { electDesignatedRouters, type DesignatedRouters } from './designatedRouter';
import { ospfInterfaceCost, toNetworkCidr } from './spf';

export interface SegmentMember {
  readonly nodeId: string;
  readonly routerId: string;
  readonly priority: number;
  readonly address: string;
}

export interface OspfSegment {
  readonly network: string;
  readonly areaId: string;
  readonly members: readonly SegmentMember[];
  /** Router ids; null when nobody may stand. */
  readonly dr: string | null;
  readonly bdr: string | null;
}

function segmentsOf(
  topology: NetworkTopology,
  held: Readonly<Record<string, DesignatedRouters>>,
): OspfSegment[] {
  return multiAccessGroups(topology).map(({ network, areaId, members }) => {
    const listed = members.map<SegmentMember>(({ node, iface }) => ({
      nodeId: node.id,
      routerId: node.data.ospfConfig?.routerId ?? node.id,
      priority: iface.ospfPriority ?? 1,
      address: iface.ipAddress,
    }));
    return { network, areaId, members: listed, ...electDesignatedRouters(listed, held[network]) };
  });
}

export interface RouterLink {
  readonly kind: 'point-to-point' | 'transit' | 'stub';
  /** A neighbour's router id, the DR's address, or a network. */
  readonly id: string;
  readonly cost: number;
}

export type Lsa =
  | {
      readonly type: 1;
      readonly lsId: string;
      readonly advertisingRouter: string;
      readonly links: readonly RouterLink[];
    }
  | {
      readonly type: 2;
      readonly lsId: string;
      readonly advertisingRouter: string;
      readonly network: string;
      readonly attachedRouters: readonly string[];
    }
  | {
      readonly type: 3;
      readonly lsId: string;
      readonly advertisingRouter: string;
      readonly cost: number;
    }
  | {
      readonly type: 5;
      readonly lsId: string;
      readonly advertisingRouter: string;
      readonly metric: number;
      readonly metricType: 1 | 2;
    };

export interface AreaLsdb {
  readonly areaId: string;
  readonly lsas: readonly Lsa[];
}

export interface OspfLsdbRouter {
  readonly nodeId: string;
  readonly routerId: string;
  readonly areas: readonly string[];
  readonly abr: boolean;
  readonly asbr: boolean;
}

export interface OspfLsdb {
  readonly areas: readonly AreaLsdb[];
  readonly routers: readonly OspfLsdbRouter[];
  readonly segments: readonly OspfSegment[];
}

export interface OspfLsdbOptions {
  /** Who holds DR and BDR now, by network. Left out, routers start together. */
  readonly held?: Readonly<Record<string, DesignatedRouters>>;
}

const routerIdOf = (node: NetlabNode) => node.data.ospfConfig?.routerId ?? node.id;

function routerLsa(
  topology: NetworkTopology,
  area: AreaModel,
  node: NetlabNode,
  segments: readonly OspfSegment[],
): Lsa {
  const links: RouterLink[] = [];
  const byId = new Map(area.routers.map((entry) => [entry.id, entry]));
  for (const iface of node.data.interfaces ?? []) {
    if (isInterfaceOnDownLink(topology, node.id, iface)) continue;
    const network = toNetworkCidr(iface);
    if (areaOfNetwork(node, network) !== area.areaId) continue;
    const cost = ospfInterfaceCost(node, iface);
    const segment = segments.find(
      (entry) =>
        entry.network === network &&
        entry.areaId === area.areaId &&
        entry.members.some((member) => member.nodeId === node.id),
    );
    const drAddress = segment?.members.find((member) => member.routerId === segment.dr)?.address;
    if (drAddress) {
      links.push({ kind: 'transit', id: drAddress, cost });
      continue;
    }
    for (const link of area.adjacency.get(node.id) ?? []) {
      const neighbour = byId.get(link.neighborId);
      if (link.localIface.id === iface.id && neighbour) {
        links.push({ kind: 'point-to-point', id: routerIdOf(neighbour), cost });
      }
    }
    links.push({ kind: 'stub', id: network, cost });
  }
  return {
    type: 1,
    lsId: routerIdOf(node),
    advertisingRouter: routerIdOf(node),
    links,
  };
}

/** What flooding would settle on: one list per area, the same for every router in it. */
export function ospfLsdb(topology: NetworkTopology, options: OspfLsdbOptions = {}): OspfLsdb {
  const areas = modelAreas(topology);
  const segments = segmentsOf(topology, options.held ?? {});
  const summaries = summariesByArea(areas);
  const routers = ospfRouters(topology);

  const externals: Lsa[] = routers.flatMap((node) =>
    (node.data.ospfConfig?.externals ?? []).map<Lsa>((external) => ({
      type: 5,
      lsId: external.network,
      advertisingRouter: routerIdOf(node),
      metric: external.metric,
      metricType: external.metricType ?? 2,
    })),
  );

  const areaLists = areas.map<AreaLsdb>((area) => {
    const lsas: Lsa[] = [
      ...area.routers
        .map((node) => routerLsa(topology, area, node, segments))
        .sort((left, right) => compareNumeric(left.lsId, right.lsId)),
      ...segments.flatMap((segment): Lsa[] => {
        const dr = segment.members.find((member) => member.routerId === segment.dr);
        if (segment.areaId !== area.areaId || !dr) return [];
        return [
          {
            type: 2,
            lsId: dr.address,
            advertisingRouter: dr.routerId,
            network: segment.network,
            attachedRouters: segment.members.map((member) => member.routerId).sort(compareNumeric),
          },
        ];
      }),
      ...(summaries.get(area.areaId) ?? [])
        .map<Lsa>((summary) => ({
          type: 3,
          lsId: summary.network,
          advertisingRouter: routerIdOf(summary.abr),
          cost: summary.cost,
        }))
        .sort(
          (left, right) =>
            compareCidr(left.lsId, right.lsId) ||
            compareNumeric(left.advertisingRouter, right.advertisingRouter),
        ),
      ...externals,
    ];
    return { areaId: area.areaId, lsas };
  });

  return {
    areas: areaLists,
    segments,
    routers: routers.map((node) => ({
      nodeId: node.id,
      routerId: routerIdOf(node),
      areas: areas.filter((area) => area.networks.has(node.id)).map((area) => area.areaId),
      abr: isAbr(areas, node.id),
      asbr: (node.data.ospfConfig?.externals ?? []).length > 0,
    })),
  };
}

/** The database `nodeId` holds: one list for each area it stands in. */
export function routerLsdb(lsdb: OspfLsdb, nodeId: string): readonly AreaLsdb[] {
  const areas = lsdb.routers.find((router) => router.nodeId === nodeId)?.areas ?? [];
  return lsdb.areas.filter((area) => areas.includes(area.areaId));
}
