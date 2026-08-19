/* @vitest-environment jsdom */

import { Graph } from '@maxgraph/core';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LayerId } from '../../types/layers';
import type { NetlabEdge, NetlabNode } from '../../types/topology';
import { GRAPH_LAYER_ORDER, layerIndex } from './maxGraphLayers';
import { applyVisibility, createLayers, syncCells } from './maxGraphModel';

function node(id: string, layerId: LayerId, x = 0): NetlabNode {
  return {
    id,
    type: layerId === 'l2' ? 'switch' : 'router',
    position: { x, y: 0 },
    data: { label: id, layerId, role: layerId === 'l2' ? 'switch' : 'router' },
  } as NetlabNode;
}

function edge(id: string, source: string, target: string): NetlabEdge {
  return { id, source, target } as NetlabEdge;
}

let graph: Graph;

beforeEach(() => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  graph = new Graph(host);
});

describe('maxGraph model building', () => {
  it('creates one layer per LayerId plus an overflow layer, all as model layers', () => {
    const layers = createLayers(graph);
    expect(layers).toHaveLength(GRAPH_LAYER_ORDER.length + 1);
    const model = graph.getDataModel();
    // "Layer" is not a name we invent — maxGraph decides it by parentage, and
    // that is what makes setVisible hide a whole layer.
    for (const layer of layers) expect(model.isLayer(layer)).toBe(true);
  });

  it('puts each node on the layer its LayerId names', () => {
    const layers = createLayers(graph);
    syncCells(graph, layers, [node('sw1', 'l2'), node('r1', 'l3', 200)], []);

    const l2 = layers[layerIndex('l2')]!;
    const l3 = layers[layerIndex('l3')]!;
    expect(l2.children?.map((c) => c.id)).toEqual(['sw1']);
    expect(l3.children?.map((c) => c.id)).toEqual(['r1']);
  });

  it('keeps a same-layer link with its nodes so hiding the layer takes it too', () => {
    const layers = createLayers(graph);
    syncCells(
      graph,
      layers,
      [node('sw1', 'l2'), node('sw2', 'l2', 200)],
      [edge('e1', 'sw1', 'sw2')],
    );
    const l2 = layers[layerIndex('l2')]!;
    expect(l2.children?.map((c) => c.id)).toContain('e1');
  });

  it('puts a cross-layer link on the always-visible overflow layer', () => {
    // An uplink belongs to neither end alone; parenting it to one would make it
    // disappear when that end is hidden while the other is still drawn.
    const layers = createLayers(graph);
    syncCells(graph, layers, [node('sw1', 'l2'), node('r1', 'l3', 200)], [edge('up', 'sw1', 'r1')]);
    expect(layers[layers.length - 1]!.children?.map((c) => c.id)).toEqual(['up']);
  });

  it('skips an edge whose endpoint does not exist instead of throwing', () => {
    const layers = createLayers(graph);
    expect(() =>
      syncCells(graph, layers, [node('sw1', 'l2')], [edge('e1', 'sw1', 'ghost')]),
    ).not.toThrow();
    expect(layers[layerIndex('l2')]!.children?.map((c) => c.id)).toEqual(['sw1']);
  });

  it('gives each vertex the glyph label, not a bare name', () => {
    // The label is what a learner reads to tell a router from a switch; a plain
    // string would drop the shape and letter that carry that without colour.
    const layers = createLayers(graph);
    syncCells(graph, layers, [node('r1', 'l3')], []);
    const value = String(layers[layerIndex('l3')]!.children![0]!.value);
    expect(value).toContain('<svg');
    expect(value).toContain('r1');
  });

  it('replaces the drawn cells on re-sync rather than accumulating them', () => {
    const layers = createLayers(graph);
    syncCells(graph, layers, [node('sw1', 'l2'), node('sw2', 'l2', 200)], []);
    syncCells(graph, layers, [node('sw1', 'l2')], []);
    expect(layers[layerIndex('l2')]!.children?.map((c) => c.id)).toEqual(['sw1']);
  });

  it('hides exactly the layers the selection leaves out', () => {
    const layers = createLayers(graph);
    syncCells(graph, layers, [node('sw1', 'l2'), node('r1', 'l3', 200)], []);
    applyVisibility(graph, layers, new Set<LayerId>(['l3']));

    expect(layers[layerIndex('l2')]!.isVisible()).toBe(false);
    expect(layers[layerIndex('l3')]!.isVisible()).toBe(true);
    // The node itself is untouched — the LAYER is what got hidden.
    expect(layers[layerIndex('l2')]!.children?.[0]!.isVisible()).toBe(true);
  });

  it('shows everything when no selection is given', () => {
    const layers = createLayers(graph);
    applyVisibility(graph, layers, undefined);
    for (const layer of layers) expect(layer.isVisible()).toBe(true);
  });

  it('brings a layer back when it is selected again', () => {
    const layers = createLayers(graph);
    applyVisibility(graph, layers, new Set<LayerId>(['l3']));
    applyVisibility(graph, layers, new Set<LayerId>(['l2', 'l3']));
    expect(layers[layerIndex('l2')]!.isVisible()).toBe(true);
  });
});
