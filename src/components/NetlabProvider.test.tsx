/* @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { useI18n } from '../i18n/useI18n';
import type { I18nContextValue } from '../i18n/types';
import * as stpModule from '../layers/l2-datalink/stp/computeStp';
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
            null,
            null,
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
      const spy = vi.spyOn(protocolRegistry, 'resolveRouteTable').mockReturnValue(routeTable);

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

  describe('stp computation', () => {
    it('computes STP state via computeStp', () => {
      const topology = makeTopology('STP');
      const stpStates = new Map([
        [
          'switch-1:p1',
          {
            switchNodeId: 'switch-1',
            portId: 'p1',
            role: 'DESIGNATED' as const,
            state: 'FORWARDING' as const,
            designatedBridge: { priority: 32768, mac: '02:00:00:10:00:01' },
            rootPathCost: 0,
          },
        ],
      ]);
      const spy = vi.spyOn(stpModule, 'computeStp').mockReturnValue({
        root: { priority: 32768, mac: '02:00:00:10:00:01' },
        ports: stpStates,
      });

      renderControlled(topology);

      expect(spy).toHaveBeenCalledWith(topology);
      expect(currentContext().topology.stpStates).toBe(stpStates);
      expect(currentContext().topology.stpRoot).toEqual({
        priority: 32768,
        mac: '02:00:00:10:00:01',
      });
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

    it('provides embed options via context', () => {
      render(
        <NetlabProvider
          topology={makeTopology('Embed')}
          sandboxEnabled
          sandboxControlMode="sandbox-owns"
          embedMode="compact"
          parentOrigin="https://teacher.example"
        >
          <CaptureNetlab />
        </NetlabProvider>,
      );

      expect(currentContext().embedMode).toBe('compact');
      expect(currentContext().parentOrigin).toBe('https://teacher.example');
      expect(currentContext().sandboxEnabled).toBe(true);
    });

    it('provides controlled sandbox options via context', () => {
      const onTopologyChange = vi.fn();
      const onSandboxEditProposed = vi.fn();

      render(
        <NetlabProvider
          topology={makeTopology('Sandbox')}
          sandboxEnabled
          sandboxControlMode="sandbox-proposes"
          sandboxProposalTimeoutMs={250}
          onTopologyChange={onTopologyChange}
          onSandboxEditProposed={onSandboxEditProposed}
        >
          <CaptureNetlab />
        </NetlabProvider>,
      );

      expect(currentContext().sandboxControlMode).toBe('sandbox-proposes');
      expect(currentContext().sandboxProposalTimeoutMs).toBe(250);
      expect(currentContext().onTopologyChange).toBe(onTopologyChange);
      expect(currentContext().onSandboxEditProposed).toBe(onSandboxEditProposed);
    });

    it('warns once per mount when controlled sandbox mode is implicit', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const topology = makeTopology('Warn');

      render(
        <NetlabProvider topology={topology} sandboxEnabled>
          <CaptureNetlab />
        </NetlabProvider>,
      );
      render(
        <NetlabProvider topology={topology} sandboxEnabled>
          <CaptureNetlab />
        </NetlabProvider>,
      );

      expect(warn).toHaveBeenCalledTimes(1);
      expect(currentContext().sandboxControlMode).toBe('sandbox-proposes');
    });

    it('does not warn when the controlled sandbox mode is explicit', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      render(
        <NetlabProvider
          topology={makeTopology('Owns')}
          sandboxEnabled
          sandboxControlMode="sandbox-owns"
        >
          <CaptureNetlab />
        </NetlabProvider>,
      );

      expect(warn).not.toHaveBeenCalled();
      expect(currentContext().sandboxControlMode).toBe('sandbox-owns');
    });
  });

  describe('locale prop', () => {
    let i18n: I18nContextValue | null = null;

    function CaptureI18n() {
      i18n = useI18n();
      return null;
    }

    beforeEach(() => {
      i18n = null;
    });

    it('defaults to en when locale prop is omitted', () => {
      render(
        <NetlabProvider topology={makeTopology('Default')}>
          <CaptureI18n />
        </NetlabProvider>,
      );

      expect(i18n?.locale).toBe('en');
    });

    it('threads the supplied locale through I18nProvider', () => {
      render(
        <NetlabProvider topology={makeTopology('Locale')} locale="ja">
          <CaptureI18n />
        </NetlabProvider>,
      );

      expect(i18n?.locale).toBe('ja');
    });
  });
});
