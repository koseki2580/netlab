/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NETLAB_LIGHT_THEME } from '../theme';
import type { NetworkTopology } from '../types/topology';
import { NetlabApp } from './NetlabApp';

const capturedCanvasProps = vi.hoisted(() => ({
  latest: null as Record<string, unknown> | null,
}));

vi.mock('./NetlabCanvas', async () => {
  const React = await import('react');

  return {
    NetlabCanvas: (props: Record<string, unknown>) => {
      capturedCanvasProps.latest = props;
      return React.createElement('div', { 'data-testid': 'netlab-canvas' });
    },
  };
});

vi.mock('./NetlabProvider', async () => {
  const React = await import('react');

  return {
    NetlabProvider: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock('../simulation/SimulationContext', async () => {
  const React = await import('react');

  return {
    SimulationProvider: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock('./simulation/SimulationControls', () => ({
  SimulationControls: () => null,
}));

vi.mock('./simulation/PacketTimeline', () => ({
  PacketTimeline: () => null,
}));

vi.mock('./simulation/PacketViewer', () => ({
  PacketViewer: () => null,
}));

vi.mock('./ResizableSidebar', async () => {
  const React = await import('react');

  return {
    ResizableSidebar: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock('./controls/RouteTable', () => ({
  RouteTable: () => null,
}));

vi.mock('./controls/AreaLegend', () => ({
  AreaLegend: () => null,
}));

const topology: NetworkTopology = {
  nodes: [
    {
      id: 'n1',
      type: 'router',
      position: { x: 0, y: 0 },
      data: { label: 'R1', role: 'router', layerId: 'l3' },
    },
  ],
  edges: [],
  areas: [],
  routeTables: new Map<string, []>(),
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
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
}

function currentCanvasProps() {
  if (!capturedCanvasProps.latest) {
    throw new Error('NetlabCanvas props were not captured');
  }

  return capturedCanvasProps.latest;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  capturedCanvasProps.latest = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  capturedCanvasProps.latest = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }
});

describe('NetlabApp color mode propagation', () => {
  it('passes light color mode to NetlabCanvas for the built-in light theme', () => {
    render(<NetlabApp topology={topology} theme={NETLAB_LIGHT_THEME} />);

    expect(currentCanvasProps().colorMode).toBe('light');
  });

  it('defaults to dark color mode when no theme prop is provided', () => {
    render(<NetlabApp topology={topology} />);

    expect(currentCanvasProps().colorMode).toBe('dark');
  });

  it('treats a light custom bgPrimary override as light mode after merging defaults', () => {
    render(<NetlabApp topology={topology} theme={{ bgPrimary: '#ffffff' }} />);

    expect(currentCanvasProps().colorMode).toBe('light');
  });

  it('passes the derived color mode through the simulation layout as well', () => {
    render(
      <NetlabApp
        topology={topology}
        theme={NETLAB_LIGHT_THEME}
        simulation
        timeline={false}
        routeTable={false}
        areaLegend={false}
      />,
    );

    expect(currentCanvasProps().colorMode).toBe('light');
  });
});
