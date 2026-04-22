/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { assertDefined } from '../../utils';
import { NetlabContext } from '../NetlabContext';
import { PacketTimeline } from './PacketTimeline';

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = () => {};

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 200, y: 0 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '10.0.0.20' },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
  areas: [],
  routeTables: new Map(),
};

const TRACE: PacketTrace = {
  packetId: 'pkt-1',
  srcNodeId: 'client-1',
  dstNodeId: 'server-1',
  status: 'delivered',
  hops: [
    {
      step: 0,
      nodeId: 'client-1',
      nodeLabel: 'Client',
      srcIp: '10.0.0.10',
      dstIp: '10.0.0.20',
      ttl: 64,
      protocol: 'TCP',
      event: 'create',
      toNodeId: 'server-1',
      activeEdgeId: 'e1',
      timestamp: 1,
    },
    {
      step: 1,
      nodeId: 'server-1',
      nodeLabel: 'Server',
      srcIp: '10.0.0.10',
      dstIp: '10.0.0.20',
      ttl: 64,
      protocol: 'TCP',
      event: 'deliver',
      timestamp: 2,
    },
  ],
};

const ACTIVE_HOP = TRACE.hops[1];
assertDefined(ACTIVE_HOP, 'expected active packet timeline hop');

function makeCtx(overrides: Partial<SimulationContextValue> = {}): SimulationContextValue {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(TOPOLOGY, hookEngine);
  const state: SimulationState = {
    status: 'paused',
    traces: [TRACE],
    currentTraceId: TRACE.packetId,
    currentStep: 1,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  };
  return {
    engine,
    state,
    sendPacket: async () => {},
    simulateDhcp: async () => false,
    simulateDns: async () => null,
    getDhcpLeaseState: () => null,
    getDnsCache: () => null,
    exportPcap: () => new Uint8Array(),
    animationSpeed: 500,
    setAnimationSpeed: () => {},
    isRecomputing: false,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

function renderTimeline(ctx: SimulationContextValue) {
  act(() => {
    root.render(
      React.createElement(
        NetlabContext.Provider,
        {
          value: {
            topology: TOPOLOGY,
            routeTable: TOPOLOGY.routeTables,
            areas: [],
            hookEngine: new HookEngine(),
          },
        },
        React.createElement(
          SimulationContext.Provider,
          { value: ctx },
          React.createElement(PacketTimeline),
        ),
      ),
    );
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('PacketTimeline a11y', () => {
  it('scroll container has role="listbox"', () => {
    renderTimeline(makeCtx());
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it('hop rows have role="option"', () => {
    renderTimeline(makeCtx());
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(TRACE.hops.length);
  });

  it('active hop has aria-selected="true"', () => {
    const ctx = makeCtx();
    (ctx.state as SimulationState).selectedHop = ACTIVE_HOP;
    renderTimeline(ctx);
    const selected = container.querySelectorAll('[role="option"][aria-selected="true"]');
    expect(selected.length).toBeGreaterThan(0);
  });
});
