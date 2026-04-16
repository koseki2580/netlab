/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TopologyEditorContextValue } from '../context/TopologyEditorContext';
import type { NetlabNode, NetlabNodeData } from '../../types/topology';
import { NodeEditorPanel } from './NodeEditorPanel';

const uiMock = vi.hoisted(() => ({
  selectedNodeId: null as string | null,
  setSelectedNodeId: vi.fn(),
}));

const editorMock = vi.hoisted(() => ({
  value: null as TopologyEditorContextValue | null,
}));

vi.mock('../../components/NetlabUIContext', () => ({
  useNetlabUI: () => uiMock,
}));

vi.mock('../context/TopologyEditorContext', () => ({
  useTopologyEditorContext: () => {
    if (!editorMock.value) {
      throw new Error('Editor context not initialized');
    }
    return editorMock.value;
  },
}));

function makeNode(
  id: string,
  role: string,
  dataOverrides: Partial<NetlabNodeData> = {},
): NetlabNode {
  return {
    id,
    type: role,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      layerId: role === 'router' ? 'l3' : role === 'switch' ? 'l2' : 'l7',
      role,
      ...dataOverrides,
    },
  } as NetlabNode;
}

function makeEditorValue(nodes: NetlabNode[]): TopologyEditorContextValue {
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
    updateNodePositions: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    setSelectedNodeId: vi.fn(),
  };
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement = <NodeEditorPanel />) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });

  return {
    rerender(nextUi: React.ReactElement = <NodeEditorPanel />) {
      act(() => {
        root?.render(nextUi);
      });
    },
  };
}

function html() {
  return renderToStaticMarkup(<NodeEditorPanel />);
}

function currentEditor() {
  if (!editorMock.value) {
    throw new Error('Editor mock not initialized');
  }

  return editorMock.value;
}

function findButton(text: string) {
  return Array.from(container?.querySelectorAll('button') ?? []).find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

function changeInput(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  );

  act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function blurInput(input: HTMLInputElement) {
  act(() => {
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  uiMock.selectedNodeId = null;
  uiMock.setSelectedNodeId.mockReset();
  editorMock.value = makeEditorValue([]);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('NodeEditorPanel', () => {
  describe('visibility', () => {
    it('returns null when no node selected', () => {
      expect(html()).toBe('');
    });

    it('returns null when selected node not found', () => {
      uiMock.selectedNodeId = 'missing';

      expect(html()).toBe('');
    });
  });

  describe('HostEditor', () => {
    it('renders IP and MAC fields for host', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', {
          label: 'Client',
          ip: '10.0.0.10',
          mac: '00:00:00:00:00:01',
        }),
      ]);

      const markup = html();

      expect(markup).toContain('IP ADDRESS');
      expect(markup).toContain('MAC ADDRESS');
      expect(markup).toContain('10.0.0.10');
      expect(markup).toContain('00:00:00:00:00:01');
    });

    it('commits IP change on blur', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', {
          label: 'Client',
          ip: '10.0.0.10',
          mac: '00:00:00:00:00:01',
        }),
      ]);
      render();

      const input = container?.querySelector(
        'input[placeholder="e.g. 10.0.0.10"]',
      ) as HTMLInputElement;

      changeInput(input, '10.0.0.20');
      blurInput(input);

      expect(currentEditor().updateNodeData).toHaveBeenCalledWith('client-1', {
        ip: '10.0.0.20',
      });
    });

    it('commits MAC change on blur', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', {
          label: 'Client',
          ip: '10.0.0.10',
          mac: '00:00:00:00:00:01',
        }),
      ]);
      render();

      const input = container?.querySelector(
        'input[placeholder="e.g. aa:bb:cc:dd:ee:ff"]',
      ) as HTMLInputElement;

      changeInput(input, '00:00:00:00:00:99');
      blurInput(input);

      expect(currentEditor().updateNodeData).toHaveBeenCalledWith('client-1', {
        mac: '00:00:00:00:00:99',
      });
    });
  });

  describe('RouterEditor', () => {
    it('renders interface list', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:00:00:01',
            },
          ],
          staticRoutes: [],
        }),
      ]);

      const markup = html();

      expect(markup).toContain('INTERFACES');
      expect(markup).toContain('eth0');
      expect(markup).toContain('10.0.0.1/24');
    });

    it('add interface creates new interface with generated ID and MAC', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [],
          staticRoutes: [],
        }),
      ]);
      render();

      act(() => {
        findButton('Add Interface')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
      });

      const calls = (currentEditor().updateNodeData as ReturnType<typeof vi.fn>).mock.calls;
      const patch = calls[calls.length - 1]?.[1] as {
        interfaces: Array<Record<string, unknown>>;
      };

      expect(patch.interfaces).toHaveLength(1);
      expect(patch.interfaces[0]).toMatchObject({
        name: 'eth0',
        ipAddress: '0.0.0.0',
        prefixLength: 24,
        id: expect.stringMatching(/^iface-/),
        macAddress: expect.stringMatching(/^02:00:/),
      });
    });

    it('delete interface removes from list', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:00:00:01',
            },
          ],
          staticRoutes: [],
        }),
      ]);
      render();

      act(() => {
        (container?.querySelector('button[title="Remove interface"]') as HTMLButtonElement)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(currentEditor().updateNodeData).toHaveBeenCalledWith('router-1', {
        interfaces: [],
      });
    });

    it('update interface field commits change', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:00:00:01',
            },
          ],
          staticRoutes: [],
        }),
      ]);
      render();

      const input = Array.from(container?.querySelectorAll('input') ?? []).find(
        (candidate) => (candidate as HTMLInputElement).value === '10.0.0.1/24',
      ) as HTMLInputElement;

      changeInput(input, '10.0.1.1/25');
      blurInput(input);

      const calls = (currentEditor().updateNodeData as ReturnType<typeof vi.fn>).mock.calls;
      const patch = calls[calls.length - 1]?.[1] as {
        interfaces: Array<Record<string, unknown>>;
      };

      expect(patch.interfaces[0]).toMatchObject({
        ipAddress: '10.0.1.1',
        prefixLength: 25,
      });
    });
  });

  describe('SwitchEditor', () => {
    it('renders port list', () => {
      uiMock.selectedNodeId = 'switch-1';
      editorMock.value = makeEditorValue([
        makeNode('switch-1', 'switch', {
          label: 'SW1',
          ports: [
            {
              id: 'port-1',
              name: 'fa0/1',
              macAddress: '00:00:00:00:00:02',
            },
          ],
        }),
      ]);

      const markup = html();

      expect(markup).toContain('PORTS');
      expect(markup).toContain('fa0/1');
      expect(markup).toContain('00:00:00:00:00:02');
    });

    it('add port creates new port with generated ID', () => {
      uiMock.selectedNodeId = 'switch-1';
      editorMock.value = makeEditorValue([
        makeNode('switch-1', 'switch', {
          label: 'SW1',
          ports: [],
        }),
      ]);
      render();

      act(() => {
        findButton('Add Port')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
      });

      const calls = (currentEditor().updateNodeData as ReturnType<typeof vi.fn>).mock.calls;
      const patch = calls[calls.length - 1]?.[1] as {
        ports: Array<Record<string, unknown>>;
      };

      expect(patch.ports[0]).toMatchObject({
        id: expect.stringMatching(/^port-/),
        name: 'fa0/0',
        macAddress: expect.stringMatching(/^02:00:/),
      });
    });

    it('delete port removes from list', () => {
      uiMock.selectedNodeId = 'switch-1';
      editorMock.value = makeEditorValue([
        makeNode('switch-1', 'switch', {
          label: 'SW1',
          ports: [
            {
              id: 'port-1',
              name: 'fa0/1',
              macAddress: '00:00:00:00:00:02',
            },
          ],
        }),
      ]);
      render();

      act(() => {
        (container?.querySelector('button[title="Remove port"]') as HTMLButtonElement)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(currentEditor().updateNodeData).toHaveBeenCalledWith('switch-1', {
        ports: [],
      });
    });
  });

  describe('StaticRoutesEditor', () => {
    it('renders route list', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [],
          staticRoutes: [
            { destination: '0.0.0.0/0', nextHop: '10.0.0.254' },
          ],
        }),
      ]);

      const markup = html();

      expect(markup).toContain('STATIC ROUTES');
      expect(markup).toContain('0.0.0.0/0');
      expect(markup).toContain('10.0.0.254');
    });

    it('add route creates default route entry', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [],
          staticRoutes: [],
        }),
      ]);
      render();

      act(() => {
        findButton('Add Route')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
      });

      expect(currentEditor().updateNodeData).toHaveBeenCalledWith('router-1', {
        staticRoutes: [{ destination: '0.0.0.0/0', nextHop: '0.0.0.0' }],
      });
    });

    it('delete route removes from list', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [],
          staticRoutes: [
            { destination: '0.0.0.0/0', nextHop: '10.0.0.254' },
          ],
        }),
      ]);
      render();

      act(() => {
        (container?.querySelector('button[title="Remove route"]') as HTMLButtonElement)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(currentEditor().updateNodeData).toHaveBeenCalledWith('router-1', {
        staticRoutes: [],
      });
    });

    it('update destination commits the edited destination string', () => {
      uiMock.selectedNodeId = 'router-1';
      editorMock.value = makeEditorValue([
        makeNode('router-1', 'router', {
          label: 'R1',
          interfaces: [],
          staticRoutes: [
            { destination: '0.0.0.0/0', nextHop: '10.0.0.254' },
          ],
        }),
      ]);
      render();

      const input = container?.querySelector(
        'input[placeholder="0.0.0.0/0"]',
      ) as HTMLInputElement;

      changeInput(input, '203.0.113.0/24');
      blurInput(input);

      const calls = (currentEditor().updateNodeData as ReturnType<typeof vi.fn>).mock.calls;
      const patch = calls[calls.length - 1]?.[1] as {
        staticRoutes: Array<Record<string, unknown>>;
      };

      expect(patch.staticRoutes[0]).toMatchObject({
        destination: '203.0.113.0/24',
      });
    });
  });

  describe('TextField', () => {
    it('syncs with external value changes', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', {
          label: 'Client A',
          ip: '10.0.0.10',
        }),
      ]);
      const view = render();

      const labelInput = container?.querySelector('input') as HTMLInputElement;
      expect(labelInput.value).toBe('Client A');

      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', {
          label: 'Client B',
          ip: '10.0.0.10',
        }),
      ]);
      uiMock.selectedNodeId = 'client-1';
      view.rerender();

      expect((container?.querySelector('input') as HTMLInputElement).value).toBe(
        'Client B',
      );
    });

    it('commits on blur when value changed', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', {
          label: 'Client',
          ip: '10.0.0.10',
        }),
      ]);
      render();

      const labelInput = container?.querySelector('input') as HTMLInputElement;

      changeInput(labelInput, 'Renamed');
      blurInput(labelInput);

      expect(currentEditor().updateNodeData).toHaveBeenCalledWith('client-1', {
        label: 'Renamed',
      });
    });

    it('does not commit on blur when value unchanged', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', {
          label: 'Client',
          ip: '10.0.0.10',
        }),
      ]);
      render();

      const labelInput = container?.querySelector('input') as HTMLInputElement;
      blurInput(labelInput);

      expect(currentEditor().updateNodeData).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    it('delete node calls deleteNode and closes panel', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', { label: 'Client' }),
      ]);
      render();

      act(() => {
        findButton('Delete Node')?.dispatchEvent(
          new MouseEvent('click', { bubbles: true }),
        );
      });

      expect(currentEditor().deleteNode).toHaveBeenCalledWith('client-1');
      expect(uiMock.setSelectedNodeId).toHaveBeenCalledWith(null);
    });

    it('Escape key closes panel', () => {
      uiMock.selectedNodeId = 'client-1';
      editorMock.value = makeEditorValue([
        makeNode('client-1', 'client', { label: 'Client' }),
      ]);
      render();

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(uiMock.setSelectedNodeId).toHaveBeenCalledWith(null);
    });
  });
});
