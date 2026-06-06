import { shouldCollapseArea, type LodConfig, NL_LOD } from '../components/edgeEncoding';
import type { NetworkArea } from '../types/areas';
import type { NetlabEdge, NetlabNode } from '../types/topology';

/**
 * C4 (LOD) — collapse crowded / zoomed-out areas into a single cluster node.
 *
 * Pure transform over the already-styled nodes/edges: for each area that should
 * collapse (too many member devices, or the viewport zoomed out past the
 * threshold) and is not manually expanded, it
 *   - drops the area background node and the area's member nodes,
 *   - injects one `AreaCluster` node at the area centre,
 *   - drops edges fully inside the area and re-points boundary edges to the
 *     cluster (stripping the now-missing handle).
 * Everything else passes through untouched, so a topology with no areas — or at
 * a high zoom — renders exactly as before.
 */
export const AREA_CLUSTER_NODE_TYPE = 'netlab-area-cluster';
const AREA_NODE_PREFIX = '__area__';

const CLUSTER_W = 150;
const CLUSTER_H = 52;
const DEFAULT_AREA_W = 300;
const DEFAULT_AREA_H = 400;

export interface AreaClusterNodeData extends Record<string, unknown> {
  areaId: string;
  name: string;
  hostCount: number;
  /** Injected by the canvas after the pure transform; pins the area open. */
  onExpand?: () => void;
}

export function clusterNodeId(areaId: string): string {
  return `__cluster__${areaId}`;
}

export interface AreaLodInput {
  areas: readonly NetworkArea[];
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  zoom: number;
  expandedAreaIds: ReadonlySet<string>;
  lod?: LodConfig;
}

export interface AreaLodResult {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
}

export function applyAreaLod(input: AreaLodInput): AreaLodResult {
  const { areas, nodes, edges, zoom, expandedAreaIds, lod = NL_LOD } = input;
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Areas to collapse, with their present member node ids.
  const collapsed = new Map<string, { area: NetworkArea; members: string[] }>();
  for (const area of areas) {
    if (expandedAreaIds.has(area.id)) continue;
    const members = area.devices.filter((id) => nodeIds.has(id));
    if (members.length === 0) continue;
    if (!shouldCollapseArea(members.length, zoom, lod)) continue;
    collapsed.set(area.id, { area, members });
  }

  if (collapsed.size === 0) {
    return { nodes, edges };
  }

  // nodeId → collapsed areaId
  const memberToArea = new Map<string, string>();
  for (const [areaId, { members }] of collapsed) {
    for (const id of members) memberToArea.set(id, areaId);
  }
  const hiddenAreaBgIds = new Set(
    Array.from(collapsed.keys()).map((id) => `${AREA_NODE_PREFIX}${id}`),
  );

  const outNodes: NetlabNode[] = [];
  for (const node of nodes) {
    if (memberToArea.has(node.id)) continue; // hidden member
    if (hiddenAreaBgIds.has(node.id)) continue; // hidden area background
    outNodes.push(node);
  }
  for (const [areaId, { area, members }] of collapsed) {
    const vc = area.visualConfig;
    const x = (vc?.x ?? 0) + (vc?.width ?? DEFAULT_AREA_W) / 2 - CLUSTER_W / 2;
    const y = (vc?.y ?? 0) + (vc?.height ?? DEFAULT_AREA_H) / 2 - CLUSTER_H / 2;
    outNodes.push({
      id: clusterNodeId(areaId),
      type: AREA_CLUSTER_NODE_TYPE,
      position: { x, y },
      draggable: false,
      data: {
        areaId,
        name: vc?.label ?? area.name,
        hostCount: members.length,
      } satisfies AreaClusterNodeData,
    } as unknown as NetlabNode);
  }

  const outEdges: NetlabEdge[] = [];
  for (const edge of edges) {
    const srcArea = memberToArea.get(edge.source);
    const tgtArea = memberToArea.get(edge.target);
    if (srcArea && tgtArea && srcArea === tgtArea) continue; // fully inside — hide
    if (!srcArea && !tgtArea) {
      outEdges.push(edge);
      continue;
    }
    const next: NetlabEdge = { ...edge };
    if (srcArea) {
      next.source = clusterNodeId(srcArea);
      next.sourceHandle = null;
    }
    if (tgtArea) {
      next.target = clusterNodeId(tgtArea);
      next.targetHandle = null;
    }
    if (next.source === next.target) continue; // collapsed to a self-loop — hide
    outEdges.push(next);
  }

  return { nodes: outNodes, edges: outEdges };
}
