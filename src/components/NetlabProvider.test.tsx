/* @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import type { RouteEntry } from '../types/routing';
import type { NetworkTopology, TopologySnapshot } from '../types/topology';
import { useNetlabContext, type NetlabContextValue } from './NetlabContext';
import { NetlabProvider } from './NetlabProvider';

function makeTopology(label: string): NetworkTopology {
  return {
    nodes: [
      {
        id: 'n1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: { label, role: 'router', layerId: 'l3' },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

function makeSnapshot(label: string): TopologySnapshot {
  return {
    nodes: [
      {
        id: 'n1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: { label, role: 'router', layerId: 'l3' },
      },
    ],
    edges: [],
    areas: [],
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestContext: NetlabContextValue | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function CaptureNetlab() {
  latestContext = useNetlabContext();
  return null;
}

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

function renderControlled(topology: NetworkTopology) {
  render(
    <NetlabProvider topology={topology}>
      <CaptureNetlab />
    </NetlabProvider>,
  );
}

function renderUncontrolled(defaultTopology: TopologySnapshot) {
  render(
    <NetlabProvider defaultTopology={defaultTopology}>
      <CaptureNetlab />
    </NetlabProvider>,
  );
}

function currentContext() {
  if (!latestContext) {
    throw new Error('Netlab context was not captured');
  }

  return latestContext;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestContext = null;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestContext = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('NetlabProvider', () => {
  describe('controlled mode', () => {
    it('uses topology prop directly', () => {
      const topology = makeTopology('Controlled');

      renderControlled(topology);

      expect(currentContext().topology.nodes[0]?.data.label).toBe('Controlled');
    });

    it('updates when topology prop changes', () => {
      renderControlled(makeTopology('Before'));

      renderControlled(makeTopology('After'));

      expect(currentContext().topology.nodes[0]?.data.label).toBe('After');
    });
  });

  describe('uncontrolled mode', () => {
    it('uses defaultTopology prop', () => {
      renderUncontrolled(makeSnapshot('Initial'));

      expect(currentContext().topology.nodes[0]?.data.label).toBe('Initial');
    });

    it('keeps initial topology stable across re-renders', () => {
      renderUncontrolled(makeSnapshot('Initial'));

      renderUncontrolled(makeSnapshot('Updated'));

      expect(currentContext().topology.nodes[0]?.data.label).toBe('Initial');
    });
  });

  describe('error handling', () => {
    it('throws when neither topology nor defaultTopology provided', () => {
      expect(() =>
        renderToStaticMarkup(
          createElement(
            NetlabProvider as unknown as (props: { children?: null }) => JSX.Element,
            {
            children: null,
            },
          ),
        ),
      ).toThrow('NetlabProvider: either topology or defaultTopology must be provided');
    });
  });

  describe('route table computation', () => {
    it('computes route table via protocolRegistry', () => {
      const topology = makeTopology('Routes');
      const routeTable = new Map<string, RouteEntry[]>([
        [
          'n1',
          [
            {
              nodeId: 'n1',
              destination: '10.0.0.0/24',
              nextHop: 'direct',
              protocol: 'static',
              adminDistance: 1,
              metric: 0,
            },
          ],
        ],
      ]);
      const spy = vi
        .spyOn(protocolRegistry, 'resolveRouteTable')
        .mockReturnValue(routeTable);

      renderControlled(topology);

      expect(spy).toHaveBeenCalledWith(topology);
      expect(currentContext().routeTable).toBe(routeTable);
    });

    it('enriches topology with route tables', () => {
      const routeTable = new Map<string, RouteEntry[]>([['n1', []]]);

      vi.spyOn(protocolRegistry, 'resolveRouteTable').mockReturnValue(routeTable);

      renderControlled(makeTopology('Routes'));

      expect(currentContext().topology.routeTables).toBe(routeTable);
    });
  });

  describe('context value', () => {
    it('provides hookEngine via context', () => {
      renderControlled(makeTopology('Hooks'));

      expect(currentContext().hookEngine).toBeInstanceOf(HookEngine);
    });

    it('provides topology via context', () => {
      renderControlled(makeTopology('Topology'));

      expect(currentContext().topology).toMatchObject({
        nodes: [expect.objectContaining({ id: 'n1' })],
        edges: [],
        areas: [],
      });
    });
  });
});
