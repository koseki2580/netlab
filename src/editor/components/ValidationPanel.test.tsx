/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationPanel } from './ValidationPanel';
import type { NetlabNode, NetlabEdge } from '../../types/topology';

function makeNode(
  id: string,
  role: string,
  overrides: Partial<NetlabNode['data']> = {},
): NetlabNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      layerId: role === 'router' ? 'l3' : role === 'switch' ? 'l2' : 'l7',
      role,
      ...overrides,
    },
  } as NetlabNode;
}

function makeEdge(source: string, target: string, overrides: Partial<NetlabEdge> = {}): NetlabEdge {
  return {
    id: overrides.id ?? `${source}-${target}`,
    source,
    target,
    ...overrides,
  } as NetlabEdge;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
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
    rerender(nextUi: React.ReactElement) {
      act(() => {
        root?.render(nextUi);
      });
    },
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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
});

describe('ValidationPanel', () => {
  it('renders a healthy state when the topology has no issues', () => {
    const nodes = [
      makeNode('client-1', 'client', { label: 'PC1', ip: '10.0.0.10' }),
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
      }),
    ];
    const edges = [makeEdge('client-1', 'router-1', { id: 'e-ok' })];

    render(<ValidationPanel nodes={nodes} edges={edges} />);

    expect(container?.textContent).toContain('✅ No issues found');
  });

  it('renders error counts and the problematic edge entry', () => {
    const nodes = [
      makeNode('client-1', 'client', { label: 'PC1', ip: '10.0.0.10' }),
      makeNode('server-1', 'server', { label: 'SRV1', ip: '10.0.0.20' }),
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
      }),
    ];
    const edges = [
      makeEdge('client-1', 'server-1', { id: 'e-invalid' }),
      makeEdge('client-1', 'router-1', { id: 'e-ok' }),
    ];

    render(<ValidationPanel nodes={nodes} edges={edges} />);

    expect(container?.textContent).toContain('1 errors');
    expect(container?.textContent).toContain('PC1 ↔ SRV1');
    expect(container?.textContent).toContain('Endpoint-to-endpoint connections are not allowed');
    expect(container?.textContent).not.toContain('e-ok');
  });

  it('renders warning counts for warning-only topologies', () => {
    const nodes = [
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
      }),
      makeNode('router-2', 'router', {
        label: 'R2',
        interfaces: [
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '10.0.1.2',
            prefixLength: 24,
            macAddress: '00:00:00:00:00:02',
          },
        ],
      }),
    ];
    const edges = [
      makeEdge('router-1', 'router-2', {
        id: 'e-warning',
        sourceHandle: 'eth0',
        targetHandle: 'eth1',
      }),
    ];

    render(<ValidationPanel nodes={nodes} edges={edges} />);

    expect(container?.textContent).toContain('1 warnings');
    expect(container?.textContent).toContain('Subnet mismatch');
  });

  it('calls onEdgeClick with the selected edge id', () => {
    const onEdgeClick = vi.fn();
    const nodes = [
      makeNode('client-1', 'client', { label: 'PC1', ip: '10.0.0.10' }),
      makeNode('server-1', 'server', { label: 'SRV1', ip: '10.0.0.20' }),
    ];
    const edges = [makeEdge('client-1', 'server-1', { id: 'e-invalid' })];

    render(<ValidationPanel nodes={nodes} edges={edges} onEdgeClick={onEdgeClick} />);

    const button = container?.querySelector('button');
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onEdgeClick).toHaveBeenCalledWith('e-invalid');
  });

  it('re-renders when the topology changes', () => {
    const nodes = [
      makeNode('client-1', 'client', { label: 'PC1', ip: '10.0.0.10' }),
      makeNode('server-1', 'server', { label: 'SRV1', ip: '10.0.0.20' }),
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
      }),
    ];
    const view = render(
      <ValidationPanel nodes={nodes} edges={[makeEdge('client-1', 'router-1', { id: 'e-ok' })]} />,
    );

    expect(container?.textContent).toContain('✅ No issues found');

    view.rerender(
      <ValidationPanel
        nodes={nodes}
        edges={[makeEdge('client-1', 'server-1', { id: 'e-invalid' })]}
      />,
    );

    expect(container?.textContent).toContain('Topology Issues');
    expect(container?.textContent).toContain('Endpoint-to-endpoint connections are not allowed');
  });
});
