/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabUIContext } from '../components/NetlabUIContext';
import { SwitchNode } from './l2-datalink/SwitchNode';
import { RouterNode } from './l3-network/RouterNode';
import { ClientNode } from './l7-application/ClientNode';
import { ServerNode } from './l7-application/ServerNode';

vi.mock('@xyflow/react', async () => {
  const React = await import('react');

  return {
    Handle: ({ id, style }: { id?: string; style?: React.CSSProperties }) =>
      React.createElement('div', { 'data-testid': `handle-${id ?? 'unknown'}`, style }),
    Position: {
      Top: 'top',
      Right: 'right',
      Bottom: 'bottom',
      Left: 'left',
    },
  };
});

type NodeComponent = (props: Record<string, unknown>) => React.ReactElement;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function renderNode(Component: NodeComponent, data: Record<string, unknown>) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(
      <NetlabUIContext.Provider value={{ selectedNodeId: null, setSelectedNodeId: vi.fn() }}>
        <Component id="node-1" data={data} />
      </NetlabUIContext.Provider>,
    );
  });

  return container;
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

describe('node theming', () => {
  it.each([
    {
      name: 'router',
      Component: RouterNode,
      label: 'R1',
      backgroundVar: '--netlab-node-router-bg',
      accentVar: '--netlab-accent-green',
    },
    {
      name: 'switch',
      Component: SwitchNode,
      label: 'SW1',
      backgroundVar: '--netlab-node-switch-bg',
      accentVar: '--netlab-accent-blue',
    },
    {
      name: 'client',
      Component: ClientNode,
      label: 'PC1',
      backgroundVar: '--netlab-node-client-bg',
      accentVar: '--netlab-accent-cyan',
    },
    {
      name: 'server',
      Component: ServerNode,
      label: 'SRV1',
      backgroundVar: '--netlab-node-server-bg',
      accentVar: '--netlab-accent-green',
    },
  ])(
    'uses CSS variables for $name node colors',
    ({ Component, label, backgroundVar, accentVar }) => {
      const rendered = renderNode(Component as unknown as NodeComponent, { label });
      const node = rendered.firstElementChild as HTMLElement;
      const labelEl = Array.from(rendered.querySelectorAll('div')).find(
        (element) => element.textContent === label,
      );
      const topHandle = rendered.querySelector('[data-testid="handle-top"]')!;
      const styledSvgElement = rendered.querySelector('svg [style]')!;

      expect(node.getAttribute('style')).toContain(`background: var(${backgroundVar})`);
      expect(node.getAttribute('style')).toContain('color: var(--netlab-text-primary)');
      expect(labelEl?.getAttribute('style')).toContain('color: var(--netlab-text-primary)');
      expect(topHandle.getAttribute('style')).toContain(`background: var(${accentVar})`);
      expect(topHandle.getAttribute('style')).toContain(`border: 1px solid var(${accentVar})`);
      expect(styledSvgElement.getAttribute('style')).toContain(`var(${accentVar})`);
    },
  );

  it('uses the semantic accent color for the router interface-down badge', () => {
    const rendered = renderNode(RouterNode as unknown as NodeComponent, {
      label: 'R1',
      _downInterfaceCount: 2,
    });
    const badge = Array.from(rendered.querySelectorAll('div')).find(
      (element) => element.textContent === '2 ifaces down',
    );

    expect(badge?.getAttribute('style')).toContain('background: var(--netlab-accent-red)');
    expect(badge?.getAttribute('style')).toContain('color: rgb(255, 255, 255)');
  });
});
