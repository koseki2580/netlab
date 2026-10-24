import { applyAreaLod, AREA_CLUSTER_NODE_TYPE, type AreaClusterNodeData } from '../areas/areaLod';
import type { FailureContextValue } from '../simulation/FailureContext';
import type { NetworkArea } from '../types/areas';
import type { HighlightMode } from '../types/simulation';
import type { NetlabEdge, NetlabNode } from '../types/topology';
import { validateAuthoredConnection as validateAuthoredLink } from '../utils/connectionValidator';

/**
 * What the simulator canvas draws, worked out from what it knows: the topology,
 * which devices and links have failed, what is selected, the packet being
 * shown, and how far the view is zoomed out. Pure functions, so the canvas
 * keeps each step in its own memo and each can be tested on its own.
 */

/** Area backgrounds are nodes too; their ids carry this prefix. */
export const AREA_NODE_PREFIX = '__area__';

/** What the canvas needs to know about failures. */
export type FailureView = Pick<
  FailureContextValue,
  'isNodeDown' | 'isEdgeDown' | 'isInterfaceDown'
>;

/** The packet's path as the simulation highlights it. */
export interface PathHighlight {
  /** The links of the hop being shown. */
  readonly activeEdgeIds: readonly string[];
  /** Every link of the path so far. */
  readonly activePathEdgeIds: readonly string[];
  readonly mode: HighlightMode;
  /** The colour of the trace being shown. */
  readonly color: string;
}

export function withValidationEdgeType(edge: NetlabEdge): NetlabEdge {
  if (edge.type && edge.type !== 'smoothstep') {
    return edge;
  }

  return { ...edge, type: 'validation-smoothstep' };
}

/**
 * Selection choreography (N2) — derive the 1-hop neighbor set from the
 * current selection. Edges where either endpoint is the selected node
 * become "neighbor" edges; their other endpoint becomes a neighbor node.
 */
export function neighboursOf(
  selectedNodeId: string | null,
  edges: readonly NetlabEdge[],
): { neighborNodeIds: Set<string>; neighborEdgeIds: Set<string> } {
  if (!selectedNodeId) {
    return {
      neighborNodeIds: new Set<string>(),
      neighborEdgeIds: new Set<string>(),
    };
  }
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === selectedNodeId) {
      nodeIds.add(edge.target);
      edgeIds.add(edge.id);
    } else if (edge.target === selectedNodeId) {
      nodeIds.add(edge.source);
      edgeIds.add(edge.id);
    }
  }
  return { neighborNodeIds: nodeIds, neighborEdgeIds: edgeIds };
}

/** Devices marked for selection and failure: a selected or neighbouring class, a down device greyed. */
export function styleNodes(
  nodes: readonly NetlabNode[],
  failure: FailureView | null | undefined,
  selectedNodeId: string | null,
  neighborNodeIds: ReadonlySet<string>,
): NetlabNode[] {
  return nodes.map((node) => {
    const downInterfaceCount = (node.data.interfaces ?? []).filter((iface) =>
      failure?.isInterfaceDown(node.id, iface.id),
    ).length;
    const isAreaNode = node.id.startsWith(AREA_NODE_PREFIX);
    const selectionClass = isAreaNode
      ? undefined
      : node.id === selectedNodeId
        ? 'netlab-node-selected'
        : neighborNodeIds.has(node.id)
          ? 'netlab-node-neighbor'
          : undefined;
    const mergedClassName = [node.className, selectionClass].filter(Boolean).join(' ');
    const classNameChanged = (mergedClassName || undefined) !== node.className;

    if (!failure?.isNodeDown(node.id) && downInterfaceCount === 0) {
      if (!classNameChanged) return node;
      return mergedClassName ? { ...node, className: mergedClassName } : node;
    }

    const nodeStyle = failure?.isNodeDown(node.id)
      ? { ...node.style, opacity: 0.4, filter: 'grayscale(80%)' }
      : node.style;
    const { style: _style, ...restNode } = node;

    return {
      ...restNode,
      ...(nodeStyle !== undefined ? { style: nodeStyle } : {}),
      ...(mergedClassName ? { className: mergedClassName } : {}),
      data:
        downInterfaceCount > 0
          ? { ...node.data, _downInterfaceCount: downInterfaceCount }
          : node.data,
    };
  });
}

/**
 * Links marked for failure, blocking, the packet's path, selection and
 * validation, in that order of precedence.
 */
export function styleEdges(
  edges: readonly NetlabEdge[],
  nodes: NetlabNode[],
  highlight: PathHighlight,
  failure: FailureView | null | undefined,
  neighborEdgeIds: ReadonlySet<string>,
  reducedMotion: boolean,
): NetlabEdge[] {
  const decorated = edges.map((edge) => {
    const baseValidationEdge = withValidationEdgeType(edge);
    const selectionClass = neighborEdgeIds.has(edge.id) ? 'netlab-edge-neighbor' : undefined;
    const mergedClassName = [baseValidationEdge.className, selectionClass]
      .filter(Boolean)
      .join(' ');
    const validationEdge: NetlabEdge = mergedClassName
      ? { ...baseValidationEdge, className: mergedClassName }
      : baseValidationEdge;

    // A link that carries nothing is drawn so on three channels — colour,
    // dash and the mark the engine puts at its middle — and the state is
    // handed on in `data.state`, whichever source said so.
    if (failure?.isEdgeDown(edge.id) || edge.data?.state === 'down') {
      return {
        ...validationEdge,
        animated: false,
        data: { ...validationEdge.data, state: 'down' as const },
        style: {
          ...validationEdge.style,
          stroke: 'var(--netlab-accent-red)',
          strokeDasharray: '6 3',
          strokeWidth: 2,
          opacity: 1,
        },
      };
    }

    if (edge.data?.state === 'blocked') {
      return {
        ...validationEdge,
        animated: false,
        style: {
          ...validationEdge.style,
          stroke: 'var(--netlab-text-muted)',
          strokeDasharray: '1 3',
          strokeWidth: 2,
          opacity: 1,
        },
      };
    }

    const isCurrentHopEdge = highlight.activeEdgeIds.includes(edge.id);
    const isPathEdge = highlight.mode === 'path' && highlight.activePathEdgeIds.includes(edge.id);

    if (isCurrentHopEdge) {
      return {
        ...validationEdge,
        animated: !reducedMotion,
        style: {
          ...validationEdge.style,
          stroke: highlight.color,
          strokeWidth: isPathEdge ? 3 : 2,
          opacity: 1,
        },
      };
    }

    if (isPathEdge) {
      return {
        ...validationEdge,
        animated: !reducedMotion,
        style: {
          ...validationEdge.style,
          stroke: highlight.color,
          strokeWidth: 2,
          opacity: 0.45,
        },
      };
    }

    // The authored variant: this grades a link that already exists, not one a
    // learner is drawing, so the editor's "put a switch between those two"
    // guidance is not a fault to paint on it.
    const validationResult = validateAuthoredLink(
      nodes,
      edges.filter((candidate) => candidate.id !== edge.id),
      edge.source,
      edge.target,
      edge.sourceHandle,
      edge.targetHandle,
    );

    if (!validationResult.valid) {
      return {
        ...validationEdge,
        style: {
          ...validationEdge.style,
          stroke: 'var(--netlab-accent-red)',
        },
        data: { ...validationEdge.data, validationResult },
      };
    }

    if (validationResult.warnings.length > 0) {
      return {
        ...validationEdge,
        style: {
          ...validationEdge.style,
          stroke: 'var(--netlab-accent-orange, orange)',
        },
        data: { ...validationEdge.data, validationResult },
      };
    }

    return validationEdge;
  });
  // Honor prefers-reduced-motion globally: nothing should march, whether the
  // animation came from the sim path or directly from the topology (the
  // learning reveal sets `animated` on its edges, bypassing the sim branches).
  return reducedMotion
    ? decorated.map((edge) => (edge.animated ? { ...edge, animated: false } : edge))
    : decorated;
}

/**
 * Collapses crowded or zoomed-out areas into one cluster each (C4 LOD), and
 * gives each cluster the callback that pins its area open.
 */
export function lodView(
  areas: readonly NetworkArea[],
  styledNodes: NetlabNode[],
  styledEdges: NetlabEdge[],
  zoom: number,
  expandedAreaIds: ReadonlySet<string>,
  expandArea: (areaId: string) => void,
): { nodes: NetlabNode[]; edges: NetlabEdge[] } {
  const lod = applyAreaLod({
    areas,
    nodes: styledNodes,
    edges: styledEdges,
    zoom,
    expandedAreaIds,
  });
  // Inject the expand callback into cluster nodes (the pure transform stays
  // callback-free); the cluster button pins its area open when clicked.
  const nodes = lod.nodes.map((node) =>
    node.type === AREA_CLUSTER_NODE_TYPE
      ? {
          ...node,
          data: {
            ...node.data,
            onExpand: () => expandArea((node.data as unknown as AreaClusterNodeData).areaId),
          },
        }
      : node,
  );
  return { nodes, edges: lod.edges };
}
