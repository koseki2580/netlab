/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LayerId } from '../../types/layers';
import type { NetlabNode } from '../../types/topology';
import MaxGraphEngineInner from './MaxGraphEngineInner';
import type { GraphEngineProps } from './types';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function node(id: string, layerId: LayerId, x = 0): NetlabNode {
  return {
    id,
    type: layerId === 'l2' ? 'switch' : 'router',
    position: { x, y: 0 },
    data: { label: id, layerId, role: layerId === 'l2' ? 'switch' : 'router' },
  } as NetlabNode;
}

const BASE: GraphEngineProps = {
  nodes: [],
  edges: [],
  isValidConnection: () => true,
  onConnect: () => {},
  onNodesMoved: () => {},
  onDeleteNode: () => {},
  onDeleteEdge: () => {},
};

function render(props: Partial<GraphEngineProps> = {}) {
  act(() => {
    root?.render(<MaxGraphEngineInner {...BASE} {...props} />);
  });
}

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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

describe('MaxGraphEngineInner', () => {
  it('mounts the canvas, the overview and the controls together', () => {
    render({ nodes: [node('sw1', 'l2')] });
    expect(testid('maxgraph-canvas')).not.toBeNull();
    expect(testid('maxgraph-controls')).not.toBeNull();
    // Assert the overview actually DREW, not merely that its box exists — the
    // container renders either way, so the box alone proves nothing.
    expect(testid('maxgraph-minimap')!.querySelector('svg')).not.toBeNull();
  });

  it('keeps the overview out of the accessibility tree', () => {
    // It is a duplicate view of the same diagram; announcing it twice would make
    // the canvas harder to navigate, not easier.
    render();
    expect(testid('maxgraph-minimap')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('tears the graph down on unmount so a second mount is clean', () => {
    render({ nodes: [node('sw1', 'l2')] });
    expect(() =>
      act(() => {
        root?.unmount();
        root = null;
      }),
    ).not.toThrow();
  });

  it('reports the grid state and flips it when toggled', () => {
    render();
    const grid = testid('maxgraph-grid')!;
    expect(grid.getAttribute('aria-pressed')).toBe('true');
    act(() => grid.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
    expect(testid('maxgraph-grid')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('does not report a selection on mount', () => {
    const onSelectNode = vi.fn();
    render({ nodes: [node('sw1', 'l2')], onSelectNode });
    expect(onSelectNode).not.toHaveBeenCalled();
  });
});
