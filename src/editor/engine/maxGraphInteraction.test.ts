/* @vitest-environment jsdom */

import { Graph, InternalEvent, type Cell } from '@maxgraph/core';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { LayerId } from '../../types/layers';
import type { NetlabNode } from '../../types/topology';
import { wireConnect, wireDelete } from './maxGraphInteraction';
import type { GraphConnection } from './types';
import { createLayers, syncCells } from './maxGraphModel';

function node(id: string, layerId: LayerId, x = 0): NetlabNode {
  return {
    id,
    type: layerId === 'l2' ? 'switch' : 'router',
    position: { x, y: 0 },
    data: { label: id, layerId, role: layerId === 'l2' ? 'switch' : 'router' },
  } as NetlabNode;
}

let graph: Graph;
let layers: Cell[];
let handlers: {
  isValidConnection: Mock<(c: GraphConnection) => boolean>;
  onConnect: Mock<(c: GraphConnection) => void>;
  onDeleteNode: Mock<(id: string) => void>;
  onDeleteEdge: Mock<(id: string) => void>;
};

function cellFor(id: string): Cell {
  return layers.flatMap((l) => l.children ?? []).find((c) => String(c.id) === id)!;
}

beforeEach(() => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  graph = new Graph(host);
  layers = createLayers(graph);
  syncCells(graph, layers, [node('sw1', 'l2'), node('r1', 'l3', 200)], []);
  handlers = {
    isValidConnection: vi.fn((_c: GraphConnection) => true),
    onConnect: vi.fn((_c: GraphConnection) => {}),
    onDeleteNode: vi.fn((_id: string) => {}),
    onDeleteEdge: vi.fn((_id: string) => {}),
  };
});

describe('maxGraph connect wiring', () => {
  it('asks the seam whether a connection is allowed, by node id', () => {
    wireConnect(graph, handlers);
    const ok = graph.isValidConnection(cellFor('sw1'), cellFor('r1'));
    expect(ok).toBe(true);
    expect(handlers.isValidConnection).toHaveBeenCalledWith({ source: 'sw1', target: 'r1' });
  });

  it('refuses when the seam refuses', () => {
    handlers.isValidConnection.mockReturnValue(false);
    wireConnect(graph, handlers);
    expect(graph.isValidConnection(cellFor('sw1'), cellFor('r1'))).toBe(false);
  });

  it('refuses a connection with no identifiable endpoint rather than asking', () => {
    // A dangling gesture must not reach the owner as a half-formed connection.
    wireConnect(graph, handlers);
    expect(graph.isValidConnection(null, cellFor('r1'))).toBe(false);
    expect(handlers.isValidConnection).not.toHaveBeenCalled();
  });

  it('reports a drawn edge to the seam and removes maxGraph’s provisional one', () => {
    wireConnect(graph, handlers);
    const model = graph.getDataModel();
    // Stand in for the gesture: insert the edge maxGraph would have made, then
    // fire the event it fires afterwards.
    const edge = graph.insertEdge({
      parent: layers[layers.length - 1]!,
      source: cellFor('sw1'),
      target: cellFor('r1'),
    });
    // Fire the event maxGraph fires after it inserts the edge, with the payload
    // its docs specify (`cell` = the inserted edge).
    const plugin = graph.getPlugin('ConnectionHandler') as unknown as {
      fireEvent: (evt: { getName: () => string; getProperty: (k: string) => unknown }) => void;
    };
    plugin.fireEvent({ getName: () => InternalEvent.CONNECT, getProperty: () => edge });

    expect(handlers.onConnect).toHaveBeenCalledWith({ source: 'sw1', target: 'r1' });
    // The owner decides what exists; leaving maxGraph's edge would double it.
    void model;
    expect(edge.parent).toBeNull();
  });
});

describe('maxGraph delete wiring', () => {
  it('routes a selected node and edge to the right seam callback', () => {
    const edge = graph.insertEdge({
      parent: layers[layers.length - 1]!,
      id: 'e1',
      source: cellFor('sw1'),
      target: cellFor('r1'),
    });
    wireDelete(graph, handlers);
    graph.setSelectionCells([cellFor('sw1'), edge]);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    expect(handlers.onDeleteNode).toHaveBeenCalledWith('sw1');
    expect(handlers.onDeleteEdge).toHaveBeenCalledWith('e1');
  });

  it('never deletes the diagram while the learner is typing', () => {
    wireDelete(graph, handlers);
    graph.setSelectionCells([cellFor('sw1')]);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(handlers.onDeleteNode).not.toHaveBeenCalled();
  });

  it('ignores keys that are not Delete or Backspace', () => {
    wireDelete(graph, handlers);
    graph.setSelectionCells([cellFor('sw1')]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(handlers.onDeleteNode).not.toHaveBeenCalled();
  });

  it('stops listening once torn down', () => {
    const dispose = wireDelete(graph, handlers);
    graph.setSelectionCells([cellFor('sw1')]);
    dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    expect(handlers.onDeleteNode).not.toHaveBeenCalled();
  });
});
