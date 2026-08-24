/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AreaClusterNode } from '../components/AreaClusterNode';
import { NetlabUIContext } from '../components/NetlabUIContext';
import { HubNode } from './l1-physical/components/HubNode';
import { SwitchNode } from './l2-datalink/SwitchNode';
import { RouterNode } from './l3-network/RouterNode';
import { ClientNode } from './l7-application/ClientNode';
import { ServerNode } from './l7-application/ServerNode';

/**
 * TC-017 / AC-013 — a device must draw itself with no graph engine mounted.
 *
 * Deliberately mocks nothing. What is being proved is that the device
 * components are free of any graph engine, which is what let the engine be
 * replaced without redrawing every device — and a mock of the engine would
 * answer the question the test is asking.
 */

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const DEVICES = [
  { name: 'router', Component: RouterNode },
  { name: 'switch', Component: SwitchNode },
  { name: 'client', Component: ClientNode },
  { name: 'server', Component: ServerNode },
  { name: 'hub', Component: HubNode },
] as const;

function render(element: React.ReactElement) {
  act(() =>
    root?.render(
      <NetlabUIContext.Provider
        value={{
          selectedNodeId: null,
          setSelectedNodeId: vi.fn(),
          highlightedAreaId: null,
          setHighlightedAreaId: vi.fn(),
        }}
      >
        {element}
      </NetlabUIContext.Provider>,
    ),
  );
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

describe('device drawings without a graph engine', () => {
  it.each(DEVICES)('$name draws itself and its name', ({ Component }) => {
    const Node = Component as unknown as (props: Record<string, unknown>) => React.ReactElement;
    render(<Node id="n1" data={{ label: 'core-1' }} />);

    const device = container?.querySelector('[data-testid="topology-node"]');
    expect(device).not.toBeNull();
    expect(device?.textContent).toContain('core-1');
  });

  // The router is the only device that carries a health badge today.
  it('the router still reports its down interfaces', () => {
    const Node = RouterNode as unknown as (props: Record<string, unknown>) => React.ReactElement;
    render(<Node id="n1" data={{ label: 'core-1', _downInterfaceCount: 2 }} />);

    const device = container?.querySelector('[data-testid="topology-node"]');
    expect(device?.textContent).toContain('2 ifaces down');
  });

  it('the area cluster that replaces collapsed devices draws its name and size', () => {
    const Node = AreaClusterNode as unknown as (
      props: Record<string, unknown>,
    ) => React.ReactElement;
    render(<Node id="a1" data={{ name: 'branch', hostCount: 4 }} />);

    expect(container?.textContent).toContain('branch');
    expect(container?.textContent).toContain('4');
  });
});
