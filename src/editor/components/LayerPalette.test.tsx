/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LayerId } from '../../types/layers';
import { TopologyEditorContext } from '../context/TopologyEditorContext';
import type { TopologyEditorContextValue } from '../context/TopologyEditorContext';
import type { NetlabNode } from '../../types/topology';
import { LayerPalette } from './LayerPalette';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let added: NetlabNode[] = [];

function ctx(): TopologyEditorContextValue {
  return {
    state: {
      topology: { nodes: [], edges: [] },
      past: [],
      future: [],
      reactFlowKey: 0,
      selectedNodeId: null,
    },
    addNode: (node) => {
      added.push(node);
    },
    deleteNode: vi.fn(),
    addEdge: vi.fn(),
    deleteEdge: vi.fn(),
    updateNodeData: vi.fn(),
    replaceTopology: vi.fn(),
    updateNodePositions: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    setSelectedNodeId: vi.fn(),
  };
}

function render(props: {
  layers?: readonly LayerId[];
  visibleLayers: ReadonlySet<LayerId>;
  onToggleLayer?: (id: LayerId) => void;
}) {
  act(() => {
    root?.render(
      <TopologyEditorContext.Provider value={ctx()}>
        <LayerPalette
          {...(props.layers !== undefined ? { layers: props.layers } : {})}
          visibleLayers={props.visibleLayers}
          onToggleLayer={props.onToggleLayer ?? (() => {})}
        />
      </TopologyEditorContext.Provider>,
    );
  });
}

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
}

function click(id: string) {
  act(() => testid(id)!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
}

const ALL = new Set<LayerId>(['l1', 'l2', 'l3', 'l4', 'l7']);

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  added = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
});

describe('LayerPalette', () => {
  it('lists every placeable element grouped by layer', () => {
    render({ visibleLayers: ALL });
    for (const id of ['switch', 'router', 'client', 'server']) {
      expect(testid(`editor-palette-${id}`), id).not.toBeNull();
    }
  });

  it('placing an element adds a node of that layer', () => {
    render({ visibleLayers: ALL });
    click('editor-palette-router');
    expect(added).toHaveLength(1);
    expect(added[0]!.data.layerId).toBe('l3');
    expect(added[0]!.type).toBe('router');
  });

  it('scopes the palette when `layers` is given, so out-of-scope elements cannot be placed', () => {
    render({ layers: ['l3'], visibleLayers: ALL });
    expect(testid('editor-palette-router')).not.toBeNull();
    // A switch is L2: absent from the palette, so there is no way to add one.
    expect(testid('editor-palette-switch')).toBeNull();
    expect(testid('editor-palette-client')).toBeNull();
  });

  it('says so rather than rendering a blank rail when the scope has no elements', () => {
    render({ layers: ['l4'], visibleLayers: ALL });
    expect(testid('editor-palette-empty')).not.toBeNull();
  });

  it('reports each layer visibility state and toggles the one that was clicked', () => {
    const onToggleLayer = vi.fn();
    render({ visibleLayers: new Set<LayerId>(['l2']), onToggleLayer });

    // aria-pressed is what a screen reader announces; assert it, not the label.
    expect(testid('editor-layer-toggle-l2')!.getAttribute('aria-pressed')).toBe('true');
    expect(testid('editor-layer-toggle-l3')!.getAttribute('aria-pressed')).toBe('false');

    click('editor-layer-toggle-l3');
    expect(onToggleLayer).toHaveBeenCalledWith('l3');
    expect(onToggleLayer).toHaveBeenCalledTimes(1);
  });
});
