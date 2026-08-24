/* @vitest-environment jsdom */

import { Graph } from '@maxgraph/core';
import { beforeEach, describe, expect, it } from 'vitest';
import type { NetlabEdge, NetlabNode } from '../../types/topology';
import {
  DEFAULT_NODE_H,
  DEFAULT_NODE_W,
  edgeStyle,
  edgeVerdictGlyph,
  edgeVerdictMessages,
  syncSimulatorCells,
} from './simulatorGraphModel';

function node(id: string, x = 0): NetlabNode {
  return {
    id,
    type: 'router',
    position: { x, y: 0 },
    data: { label: id, layerId: 'l3', role: 'router' },
  } as NetlabNode;
}

function edge(id: string, source: string, target: string, extra: Partial<NetlabEdge> = {}) {
  return { id, source, target, ...extra } as NetlabEdge;
}

let graph: Graph;
let parent: ReturnType<Graph['getDefaultParent']>;

const elements = new Map<string, HTMLElement>();

function drawnHost(target: NetlabNode) {
  let element = elements.get(target.id);
  if (!element) {
    element = document.createElement('div');
    element.setAttribute('data-testid', 'topology-node');
    element.textContent = target.data.label;
    elements.set(target.id, element);
  }
  return { element, width: DEFAULT_NODE_W, height: DEFAULT_NODE_H };
}

beforeEach(() => {
  elements.clear();
  const host = document.createElement('div');
  document.body.appendChild(host);
  graph = new Graph(host);
  graph.setHtmlLabels(true);
  parent = graph.getDefaultParent();
});

describe('drawing the simulator topology with maxGraph', () => {
  // TC-018
  it('draws every device, carrying the element its React component renders into', () => {
    const nodes = [node('r1'), node('r2', 200), node('r3', 400)];
    const cells = syncSimulatorCells(graph, parent, nodes, [], drawnHost);

    expect([...cells.keys()].sort()).toEqual(['r1', 'r2', 'r3']);
    for (const target of nodes) {
      const cell = cells.get(target.id)!;
      expect(cell.value).toBe(elements.get(target.id));
      expect(cell.geometry?.x).toBe(target.position.x);
    }
  });

  // TC-019
  it('skips a link to a device that is not drawn rather than failing the canvas', () => {
    const nodes = [node('r1'), node('r2', 200)];
    const edges = [edge('e1', 'r1', 'r2'), edge('gone', 'r1', 'collapsed-area')];

    syncSimulatorCells(graph, parent, nodes, edges, drawnHost);

    const model = graph.getDataModel();
    const drawnEdge = model.getCell('e1');
    expect(drawnEdge?.isEdge()).toBe(true);
    expect(drawnEdge?.source?.id).toBe('r1');
    expect(drawnEdge?.target?.id).toBe('r2');
    expect(model.getCell('gone')).toBeUndefined();
    // The devices are still drawn — the bad link did not take them with it.
    expect(model.getCell('r1')?.isVertex()).toBe(true);
    expect(model.getCell('r2')?.isVertex()).toBe(true);
  });

  // TC-020
  it('paints a link with the colour, weight and dashes the canvas computed', () => {
    const down = edge('e1', 'r1', 'r2', {
      style: { stroke: 'var(--netlab-accent-red)', strokeWidth: 2, strokeDasharray: '6 3' },
    });
    const style = edgeStyle(down);

    expect(style.strokeColor).toBe('var(--netlab-accent-red)');
    expect(style.strokeWidth).toBe(2);
    expect(style.dashed).toBe(true);
    expect(style.dashPattern).toBe('6 3');
  });

  // TC-020
  it('leaves a plain link undashed', () => {
    const style = edgeStyle(edge('e1', 'r1', 'r2'));
    expect(style.dashed).toBeUndefined();
    expect(style.strokeWidth).toBe(1);
  });

  // TC-023 — a wrong cable is marked on the link itself.
  it('marks a link the canvas found errors on, and says what they are', () => {
    const bad = edge('e1', 'r1', 'r2', {
      data: {
        validationResult: {
          errors: [{ message: 'Router to router needs a crossover cable' }],
          warnings: [],
        },
      },
    });

    expect(edgeVerdictGlyph(bad)).toBe('\u274c');
    expect(edgeVerdictMessages(bad)).toContain('crossover');

    const drawn = syncSimulatorCells(
      graph,
      parent,
      [node('r1'), node('r2', 200)],
      [bad],
      drawnHost,
    );
    expect(drawn.size).toBe(2);
    expect(graph.getDataModel().getCell('e1')?.value).toBe('\u274c');
  });

  // TC-023
  it('marks a link with only warnings differently, and a clean link not at all', () => {
    const warned = edge('e1', 'r1', 'r2', {
      data: { validationResult: { errors: [], warnings: [{ message: 'Speed mismatch' }] } },
    });
    expect(edgeVerdictGlyph(warned)).toBe('\u26a0\ufe0f');
    expect(edgeVerdictGlyph(edge('e2', 'r1', 'r2'))).toBe('');
  });

  // TC-018 — redrawing must not leave the previous topology behind.
  it('replaces the previous drawing rather than adding to it', () => {
    syncSimulatorCells(
      graph,
      parent,
      [node('r1'), node('r2', 200)],
      [edge('e1', 'r1', 'r2')],
      drawnHost,
    );
    const cells = syncSimulatorCells(graph, parent, [node('r1')], [], drawnHost);

    expect([...cells.keys()]).toEqual(['r1']);
    const model = graph.getDataModel();
    expect(model.getCell('r2')).toBeUndefined();
    expect(model.getCell('e1')).toBeUndefined();
  });
});
