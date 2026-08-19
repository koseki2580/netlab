/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import type { InFlightPacket } from '../../types/packets';
import type { NetlabNode } from '../../types/topology';
import { TopologyEditorContext } from '../context/TopologyEditorContext';
import type { TopologyEditorContextValue } from '../context/TopologyEditorContext';
import { EditorRunButton } from './EditorRunButton';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function host(id: string, role: string, ip?: string): NetlabNode {
  return {
    id,
    type: role,
    position: { x: 0, y: 0 },
    data: { label: id, layerId: 'l7', role, ...(ip ? { ip } : {}) },
  } as NetlabNode;
}

function editorCtx(nodes: NetlabNode[]): TopologyEditorContextValue {
  return {
    state: {
      topology: { nodes, edges: [] },
      past: [],
      future: [],
      reactFlowKey: 0,
      selectedNodeId: null,
    },
    addNode: vi.fn(),
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

function render(nodes: NetlabNode[], sendPacket?: SimulationContextValue['sendPacket']) {
  const sim = sendPacket
    ? ({ sendPacket, state: { traces: [] } } as unknown as SimulationContextValue)
    : null;
  act(() => {
    root?.render(
      <TopologyEditorContext.Provider value={editorCtx(nodes)}>
        {sim ? (
          <SimulationContext.Provider value={sim}>
            <EditorRunButton />
          </SimulationContext.Provider>
        ) : (
          <EditorRunButton />
        )}
      </TopologyEditorContext.Provider>,
    );
  });
}

function button() {
  return container?.querySelector('[data-testid="editor-run"]') as HTMLButtonElement | null;
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

describe('EditorRunButton', () => {
  it('sends between the two addressable hosts', async () => {
    const sendPacket = vi.fn(async (_packet: InFlightPacket) => {});
    render([host('c1', 'client', '10.0.0.10'), host('s1', 'server', '10.0.1.10')], sendPacket);
    expect(button()!.disabled).toBe(false);

    await act(async () => {
      button()!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });
    expect(sendPacket).toHaveBeenCalledTimes(1);
    const packet = sendPacket.mock.calls[0]![0];
    expect(packet.srcNodeId).toBe('c1');
    expect(packet.dstNodeId).toBe('s1');
  });

  it('refuses, and says why, when nothing is addressable yet', () => {
    const sendPacket = vi.fn(async (_packet: InFlightPacket) => {});
    // Freshly placed nodes carry no IP — the palette does not invent one.
    render([host('c1', 'client'), host('s1', 'server')], sendPacket);
    expect(button()!.disabled).toBe(true);
    expect(button()!.getAttribute('aria-label')).toContain('IP address');
  });

  it('refuses, and says why, when there is no simulation to run', () => {
    render([host('c1', 'client', '10.0.0.10'), host('s1', 'server', '10.0.1.10')]);
    expect(button()!.disabled).toBe(true);
    expect(button()!.getAttribute('aria-label')).toContain('not available');
  });

  it('names the endpoints so the learner knows what Run will do before clicking', () => {
    const sendPacket = vi.fn(async (_packet: InFlightPacket) => {});
    render([host('c1', 'client', '10.0.0.10'), host('s1', 'server', '10.0.1.10')], sendPacket);
    expect(button()!.getAttribute('aria-label')).toBe('Send a packet c1 → s1');
  });
});
