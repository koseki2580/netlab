import { Cell, type Graph, type CellStyle } from '@maxgraph/core';
import { NODE_GLYPHS, type NodeGlyphKind } from '../../components/NodeGlyph';
import type { LayerId } from '../../types/layers';
import type { NetlabEdge, NetlabNode } from '../../types/topology';
import { GRAPH_LAYER_ORDER, layerIndex, layerVisibility } from './maxGraphLayers';
import { EDGE_TONE_COLOR, edgeVerdict } from './edgeValidation';
import { nodeLabelHtml } from './maxGraphNodeLabel';

export const NODE_W = 120;
export const NODE_H = 44;

/** Vertex style per device kind, mirroring the glyph so both canvases agree. */
export function styleFor(node: NetlabNode): CellStyle {
  const glyph = NODE_GLYPHS[node.type as NodeGlyphKind];
  return {
    fillColor: 'var(--netlab-bg-primary)',
    strokeColor: glyph ? glyph.color : 'var(--netlab-text-muted)',
    strokeWidth: 2,
    fontColor: 'var(--netlab-text-primary)',
    fontSize: 12,
    rounded: true,
  };
}

/**
 * One graph layer per `LayerId`, plus a trailing layer for ids we do not know.
 *
 * These are direct children of the model root, which is what makes maxGraph
 * treat them as layers and lets `setVisible` hide a whole layer at once.
 */
export function createLayers(graph: Graph): Cell[] {
  const model = graph.getDataModel();
  const root = model.getRoot()!;
  const layers: Cell[] = [];
  model.beginUpdate();
  try {
    for (let i = 0; i <= GRAPH_LAYER_ORDER.length; i += 1) {
      const layer = new Cell();
      model.add(root, layer);
      layers.push(layer);
    }
  } finally {
    model.endUpdate();
  }
  return layers;
}

/** Replace every drawn cell with the current topology. */
export function syncCells(
  graph: Graph,
  layers: readonly Cell[],
  nodes: readonly NetlabNode[],
  edges: readonly NetlabEdge[],
  highlightEdgeId?: string | null,
): void {
  const model = graph.getDataModel();
  model.beginUpdate();
  try {
    for (const layer of layers) {
      for (const child of [...(layer.children ?? [])]) model.remove(child);
    }

    const byId = new Map<string, Cell>();
    for (const node of nodes) {
      const parent = layers[layerIndex(node.data.layerId)]!;
      byId.set(
        node.id,
        graph.insertVertex({
          parent,
          id: node.id,
          value: nodeLabelHtml(node),
          position: [node.position.x, node.position.y],
          size: [NODE_W, NODE_H],
          style: styleFor(node),
        }),
      );
    }

    for (const edge of edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      // A half-built edge must not throw and take the canvas down with it.
      if (!source || !target) continue;
      // Same layer keeps the link with its nodes, so hiding a layer hides its
      // links too. A cross-layer link lives on the overflow layer, which is
      // always visible — otherwise the uplink would vanish with either end.
      const parent = source.parent === target.parent ? source.parent! : layers[layers.length - 1]!;
      // A wrong cable is the lesson, so the verdict is painted rather than left
      // for the validation panel alone. Same helper as the React Flow engine.
      const verdict = edgeVerdict(nodes, edges, edge);
      graph.insertEdge({
        parent,
        id: edge.id,
        source,
        target,
        value: verdict.messages.join('\n'),
        style: {
          strokeWidth: edge.id === highlightEdgeId ? 3 : 1,
          strokeColor: EDGE_TONE_COLOR[verdict.tone],
          // A link is a cable, not a direction. maxGraph's default arrowhead
          // reads as "traffic flows this way", and the simulator canvas draws
          // the same cable plain.
          endArrow: 'none',
        },
      });
    }
  } finally {
    model.endUpdate();
  }
}

/** Show or hide whole layers — the engine's own feature, not a filtered rebuild. */
export function applyVisibility(
  graph: Graph,
  layers: readonly Cell[],
  visibleLayers?: ReadonlySet<LayerId>,
): void {
  const model = graph.getDataModel();
  const flags = layerVisibility(visibleLayers);
  model.beginUpdate();
  try {
    flags.forEach((visible, index) => {
      const layer = layers[index];
      if (layer) model.setVisible(layer, visible);
    });
  } finally {
    model.endUpdate();
  }
}
