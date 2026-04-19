/* @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetlabEdge, NetlabNode } from '../../types/topology';
import { MAX_HISTORY_SIZE, type EditorTopology } from '../types';
import { useTopologyEditor, type UseTopologyEditorOptions } from './useTopologyEditor';
import type { TopologyEditorContextValue } from '../context/TopologyEditorContext';

function makeNode(id: string, overrides: Partial<NetlabNode> = {}): NetlabNode {
  return {
    id,
    type: 'host',
    position: { x: 0, y: 0 },
    data: { label: id, role: 'host', layerId: 'l3', ip: `10.0.0.${id.slice(1)}` },
    ...overrides,
  } as NetlabNode;
}

function makeEdge(
  id: string,
  source = 'n1',
  target = 'n2',
  overrides: Partial<NetlabEdge> = {},
): NetlabEdge {
  return {
    id,
    source,
    target,
    ...overrides,
  } as NetlabEdge;
}

function makeTopology(overrides: Partial<EditorTopology> = {}): EditorTopology {
  return {
    nodes: [makeNode('n1')],
    edges: [],
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestEditor: TopologyEditorContextValue | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function CaptureEditor({ options }: { options?: UseTopologyEditorOptions }) {
  latestEditor = useTopologyEditor(options);
  return null;
}

function render(options?: UseTopologyEditorOptions) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(createElement(CaptureEditor, options === undefined ? {} : { options }));
  });
}

function currentEditor() {
  if (!latestEditor) {
    throw new Error('Topology editor hook was not captured');
  }

  return latestEditor;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestEditor = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestEditor = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('useTopologyEditor', () => {
  describe('COMMIT', () => {
    it('pushes current topology to past', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });

      expect(currentEditor().state.past).toHaveLength(1);
      expect(currentEditor().state.past[0]?.topology.nodes).toHaveLength(1);
      expect(currentEditor().state.topology.nodes).toHaveLength(2);
    });

    it('clears future on new commit', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });

      expect(currentEditor().state.future).toHaveLength(1);

      act(() => {
        currentEditor().addNode(makeNode('n3'));
      });

      expect(currentEditor().state.future).toEqual([]);
    });

    it('caps past at MAX_HISTORY_SIZE', () => {
      render({ initialTopology: makeTopology({ nodes: [] }) });

      for (let index = 0; index < MAX_HISTORY_SIZE + 5; index += 1) {
        act(() => {
          currentEditor().addNode(makeNode(`n${index + 1}`));
        });
      }

      expect(currentEditor().state.past).toHaveLength(MAX_HISTORY_SIZE);
    });
  });

  describe('UNDO', () => {
    it('restores previous topology from past', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });

      expect(currentEditor().state.topology.nodes.map((node) => node.id)).toEqual(['n1']);
    });

    it('pushes current to future', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });

      expect(currentEditor().state.future).toHaveLength(1);
      expect(currentEditor().state.future[0]?.topology.nodes.map((node) => node.id)).toEqual([
        'n1',
        'n2',
      ]);
    });

    it('increments reactFlowKey', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });

      expect(currentEditor().state.reactFlowKey).toBe(1);
    });

    it('is a no-op when past is empty', () => {
      render({ initialTopology: makeTopology() });
      const before = currentEditor().state;

      act(() => {
        currentEditor().undo();
      });

      expect(currentEditor().state).toBe(before);
    });
  });

  describe('REDO', () => {
    it('restores topology from future', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });
      act(() => {
        currentEditor().redo();
      });

      expect(currentEditor().state.topology.nodes.map((node) => node.id)).toEqual(['n1', 'n2']);
    });

    it('pushes current to past', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });
      act(() => {
        currentEditor().redo();
      });

      expect(currentEditor().state.past).toHaveLength(1);
      expect(currentEditor().state.past[0]?.topology.nodes.map((node) => node.id)).toEqual(['n1']);
    });

    it('increments reactFlowKey', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });
      act(() => {
        currentEditor().redo();
      });

      expect(currentEditor().state.reactFlowKey).toBe(2);
    });

    it('is a no-op when future is empty', () => {
      render({ initialTopology: makeTopology() });
      const before = currentEditor().state;

      act(() => {
        currentEditor().redo();
      });

      expect(currentEditor().state).toBe(before);
    });
  });

  describe('UPDATE_POSITIONS', () => {
    it('applies position updates to matching nodes', () => {
      render({ initialTopology: makeTopology({ nodes: [makeNode('n1'), makeNode('n2')] }) });

      act(() => {
        currentEditor().updateNodePositions([{ id: 'n2', position: { x: 100, y: 200 } }]);
      });

      expect(
        currentEditor().state.topology.nodes.find((node) => node.id === 'n2')?.position,
      ).toEqual({ x: 100, y: 200 });
    });

    it('ignores position updates for non-existent nodes', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().updateNodePositions([{ id: 'missing', position: { x: 100, y: 200 } }]);
      });

      expect(currentEditor().state.topology.nodes[0]?.position).toEqual({ x: 0, y: 0 });
      expect(currentEditor().state.past).toEqual([]);
    });
  });

  describe('SET_SELECTED', () => {
    it('sets selectedNodeId', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().setSelectedNodeId('n1');
      });

      expect(currentEditor().state.selectedNodeId).toBe('n1');
    });

    it('sets selectedNodeId to null', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().setSelectedNodeId('n1');
      });
      act(() => {
        currentEditor().setSelectedNodeId(null);
      });

      expect(currentEditor().state.selectedNodeId).toBeNull();
    });
  });

  describe('hook API', () => {
    it('deleteNode removes node and connected edges', () => {
      render({
        initialTopology: makeTopology({
          nodes: [makeNode('n1'), makeNode('n2')],
          edges: [makeEdge('e1')],
        }),
      });

      act(() => {
        currentEditor().deleteNode('n1');
      });

      expect(currentEditor().state.topology.nodes.map((node) => node.id)).toEqual(['n2']);
      expect(currentEditor().state.topology.edges).toEqual([]);
    });

    it('updateNodeData updates node data', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().updateNodeData('n1', {
          label: 'Renamed',
          mac: '00:00:00:00:00:01',
        });
      });

      expect(currentEditor().state.topology.nodes[0]?.data).toMatchObject({
        label: 'Renamed',
        mac: '00:00:00:00:00:01',
      });
    });

    it('addEdge commits to history', () => {
      render({
        initialTopology: makeTopology({
          nodes: [makeNode('n1'), makeNode('n2')],
          edges: [],
        }),
      });

      act(() => {
        currentEditor().addEdge(makeEdge('e1'));
      });

      expect(currentEditor().state.topology.edges).toHaveLength(1);
      expect(currentEditor().state.past).toHaveLength(1);
    });

    it('deleteEdge removes edge', () => {
      render({
        initialTopology: makeTopology({
          nodes: [makeNode('n1'), makeNode('n2')],
          edges: [makeEdge('e1')],
        }),
      });

      act(() => {
        currentEditor().deleteEdge('e1');
      });

      expect(currentEditor().state.topology.edges).toEqual([]);
    });

    it('undo/redo cycle restores previous state', () => {
      render({ initialTopology: makeTopology() });

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });
      act(() => {
        currentEditor().undo();
      });
      act(() => {
        currentEditor().redo();
      });

      expect(currentEditor().state.topology.nodes.map((node) => node.id)).toEqual(['n1', 'n2']);
    });

    it('canUndo is false initially, true after commit', () => {
      render({ initialTopology: makeTopology() });

      expect(currentEditor().canUndo).toBe(false);

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });

      expect(currentEditor().canUndo).toBe(true);
    });

    it('canRedo is false until undo is called', () => {
      render({ initialTopology: makeTopology() });

      expect(currentEditor().canRedo).toBe(false);

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });

      expect(currentEditor().canRedo).toBe(false);

      act(() => {
        currentEditor().undo();
      });

      expect(currentEditor().canRedo).toBe(true);
    });

    it('onTopologyChange callback fires on topology change', () => {
      const onTopologyChange = vi.fn();
      render({
        initialTopology: makeTopology(),
        onTopologyChange,
      });

      onTopologyChange.mockClear();

      act(() => {
        currentEditor().addNode(makeNode('n2'));
      });

      expect(onTopologyChange).toHaveBeenCalledOnce();
      expect(onTopologyChange).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: [expect.objectContaining({ id: 'n1' }), expect.objectContaining({ id: 'n2' })],
        }),
      );
    });
  });
});
