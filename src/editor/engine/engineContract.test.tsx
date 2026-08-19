/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NetlabNode } from '../../types/topology';
import { createRouterNode, createSwitchNode } from '../utils/nodeFactory';
import { TopologyEditor } from '../components/TopologyEditor';
import type { GraphEngineProps } from './types';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let seen: GraphEngineProps[] = [];

/** The most recent props the editor pushed at the engine. */
function last(): GraphEngineProps {
  return seen[seen.length - 1]!;
}

/** A recording stand-in: proves the editor drives the seam, not one library. */
function ProbeEngine(props: GraphEngineProps) {
  seen.push(props);
  return <div data-testid="probe-engine" />;
}

/** Built through the real factories: switches need port MACs for STP to run. */
function node(id: string, layerId: 'l2' | 'l3', x = 0): NetlabNode {
  const built = layerId === 'l2' ? createSwitchNode({ x, y: 0 }) : createRouterNode({ x, y: 0 });
  return { ...built, id, data: { ...built.data, label: id } };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  seen = [];
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

function render(initial: { nodes: NetlabNode[]; edges: [] }) {
  act(() => {
    root?.render(<TopologyEditor engine={ProbeEngine} initialTopology={initial} />);
  });
}

describe('GraphEngine seam', () => {
  it('hands the engine the whole topology plus which layers to paint, not a filtered view', () => {
    // Filtering is the engine's job — an engine with a native layer model hides
    // rather than drops, and it cannot hide what it was never given. Asserting
    // this with every layer visible would pass either way, so turn one off.
    render({ nodes: [node('sw1', 'l2'), node('r1', 'l3')], edges: [] });
    act(() => {
      (
        container?.querySelector('[data-testid="editor-layer-toggle-l2"]') as HTMLElement
      ).dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });

    const props = last();
    expect([...(props.visibleLayers ?? [])].sort()).toEqual(['l3', 'l7']);
    expect(props.nodes.map((n) => n.id)).toEqual(['sw1', 'r1']);
  });

  it('routes a connection the engine reports into the topology', () => {
    render({ nodes: [node('sw1', 'l2'), node('r1', 'l3', 200)], edges: [] });
    act(() => {
      last().onConnect({ source: 'sw1', target: 'r1' });
    });
    const props = last();
    expect(props.edges).toHaveLength(1);
    expect(props.edges[0]).toMatchObject({ source: 'sw1', target: 'r1' });
  });

  it('lets the engine ask whether a connection is allowed before making it', () => {
    render({ nodes: [node('sw1', 'l2')], edges: [] });
    // A node cannot link to itself; the seam must answer, not the engine guess.
    expect(last().isValidConnection({ source: 'sw1', target: 'sw1' })).toBe(false);
  });

  it('routes node moves and deletions back into the topology', () => {
    render({ nodes: [node('sw1', 'l2'), node('r1', 'l3', 200)], edges: [] });
    act(() => {
      last().onNodesMoved([{ id: 'sw1', position: { x: 40, y: 60 } }]);
    });
    expect(last().nodes.find((n) => n.id === 'sw1')!.position).toEqual({ x: 40, y: 60 });

    act(() => {
      last().onDeleteNode('r1');
    });
    expect(last().nodes.map((n) => n.id)).toEqual(['sw1']);
  });
});
