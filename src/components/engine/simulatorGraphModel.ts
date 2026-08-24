import { Cell, type CellStyle, type Graph } from '@maxgraph/core';
import { markDrawnLinks } from '../../editor/engine/maxGraphLinkMarks';
import { getValidationMessages, type ValidationEdgeData } from '../ValidationEdgeLabel';
import type { NetlabEdge, NetlabNode } from '../../types/topology';

/**
 * Drawing the simulator's topology with maxGraph.
 *
 * The devices themselves stay React components: each cell's value is the
 * element that device is rendered into, so the router on this canvas is the
 * same RouterNode the rest of the app draws. maxGraph owns placement, links,
 * selection and the viewport; React owns what a device looks like.
 *
 * Kept apart from the component so it can be exercised against a real Graph
 * without a React lifecycle in the way — the editor's model module is split the
 * same way, for the same reason.
 */

/** Fallback size for a device whose element has not been measured yet. */
export const DEFAULT_NODE_W = 96;
export const DEFAULT_NODE_H = 76;

export interface DrawnNode {
  /** The element the device's React component is rendered into. */
  element: HTMLElement;
  width: number;
  height: number;
}

/**
 * The cell shows its HTML label and nothing else — no box drawn around it.
 *
 * Deliberately not `overflow: 'fill'`: that stretches the label element to the
 * cell bounds, and since the cell bounds are measured from that same element,
 * each redraw would measure a device that the previous redraw had inflated.
 */
/**
 * An area background is a tint the devices sit on; anything painted behind it
 * shows through and ruins it. Devices are opaque, so a box behind them is
 * invisible on the canvas and is what makes them legible in the overview.
 */
const AREA_NODE_TYPES = new Set(['netlab-area', 'netlab-area-cluster']);

export function nodeStyle(node: NetlabNode): CellStyle {
  const transparent = AREA_NODE_TYPES.has(node.type ?? '');
  return {
    // A box behind the device, not instead of it. The overview renders shapes
    // rather than HTML labels, and without a shape it showed an empty frame
    // with the viewport rectangle floating in it.
    fillColor: transparent ? 'none' : '#334155',
    strokeColor: transparent ? 'none' : '#475569',
    rounded: true,
    verticalAlign: 'middle',
    align: 'center',
  };
}

/**
 * A link's appearance comes from the same `style` the canvas already computes
 * for it, so failure red, path highlight and dashed "down" links look the same
 * whichever engine draws them.
 */
export function edgeStyle(edge: NetlabEdge): CellStyle {
  const style = (edge.style ?? {}) as {
    stroke?: string;
    strokeWidth?: number | string;
    strokeDasharray?: string;
    opacity?: number | string;
  };
  const width = Number(style.strokeWidth);
  const opacity = Number(style.opacity);
  return {
    strokeColor: style.stroke ?? 'var(--netlab-border)',
    strokeWidth: Number.isFinite(width) && width > 0 ? width : 1,
    ...(style.strokeDasharray ? { dashed: true, dashPattern: style.strokeDasharray } : {}),
    ...(Number.isFinite(opacity) ? { opacity: opacity * 100 } : {}),
    endArrow: 'none',
    edgeStyle: 'orthogonalEdgeStyle',
    rounded: true,
  };
}

/**
 * What a link with a bad cable is marked with.
 *
 * A wrong cable is the lesson, so the verdict is drawn on the link rather than
 * left to the validation panel alone — the same reason the editor paints its
 * links by verdict.
 */
export function edgeVerdictGlyph(edge: NetlabEdge): string {
  const result = (edge.data as ValidationEdgeData | undefined)?.validationResult;
  if (!result) return '';
  if (result.errors.length > 0) return '\u274c';
  if (result.warnings.length > 0) return '\u26a0\ufe0f';
  return '';
}

/** The messages behind that mark, shown on hover. */
export function edgeVerdictMessages(edge: NetlabEdge): string {
  return getValidationMessages(
    (edge.data as ValidationEdgeData | undefined)?.validationResult,
  ).join('\n');
}

/**
 * Replace every drawn cell with the current topology.
 *
 * Returns the cell for each node id so the caller can position the React
 * portals and answer "which device was clicked?" without walking the model.
 */
export function syncSimulatorCells(
  graph: Graph,
  parent: Cell,
  nodes: readonly NetlabNode[],
  edges: readonly NetlabEdge[],
  drawn: (node: NetlabNode) => DrawnNode,
): Map<string, Cell> {
  const model = graph.getDataModel();
  const byId = new Map<string, Cell>();
  model.beginUpdate();
  try {
    for (const child of [...(parent.children ?? [])]) model.remove(child);

    for (const node of nodes) {
      const host = drawn(node);
      byId.set(
        node.id,
        graph.insertVertex({
          parent,
          id: node.id,
          value: host.element,
          position: [node.position.x, node.position.y],
          size: [host.width, host.height],
          style: nodeStyle(node),
        }),
      );
    }

    for (const edge of edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      // A link to a device that is not drawn — a collapsed area, a half-built
      // topology — must not throw and take the canvas down with it.
      if (!source || !target) continue;
      graph.insertEdge({
        parent,
        id: edge.id,
        source,
        target,
        value: edgeVerdictGlyph(edge),
        style: edgeStyle(edge),
      });
    }
  } finally {
    model.endUpdate();
  }
  return byId;
}

/**
 * Put the canvas's own marks on the drawn links.
 *
 * `data-edge-animated` says this link is being shown in motion (REQ-013); it
 * goes on the drawn shape, so the mark means "this is animating on screen"
 * rather than "this was asked to animate". `netlab-edge` plus whatever class
 * the canvas computed carries the selection choreography, which is styled
 * against the canvas's class names rather than any engine's.
 */
export function decorateEdges(graph: Graph, edges: readonly NetlabEdge[]): void {
  markDrawnLinks(graph, edges);
}
