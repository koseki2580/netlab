/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacketHop } from '../../types/simulation';

const mocks = vi.hoisted(() => ({
  selectedHop: null as PacketHop | null,
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => ({
    topology: {
      nodes: [{ id: 'r1', type: 'netlab-node', data: { role: 'router', label: 'R-1' } }],
      edges: [],
    },
    routeTable: new Map([
      [
        'r1',
        [
          {
            destination: '10.0.0.0/24',
            nextHop: 'direct',
            protocol: 'connected',
            adminDistance: 0,
          },
          {
            destination: '203.0.113.0/24',
            nextHop: 'direct',
            protocol: 'connected',
            adminDistance: 0,
          },
        ],
      ],
    ]),
    areas: [],
  }),
}));

vi.mock('../../simulation/SimulationContext', () => ({
  useOptionalSimulation: () => ({ state: { selectedHop: mocks.selectedHop } }),
}));

import { RouteTablePanel } from './RouteTable';

function routerHop(nodeId: string): PacketHop {
  const winner = {
    destination: '203.0.113.0/24',
    nextHop: 'direct',
    metric: 0,
    protocol: 'connected',
    adminDistance: 0,
    matched: true,
    selectedByLpm: true,
  };
  return {
    step: 4,
    nodeId,
    nodeLabel: 'R-1',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'TCP',
    event: 'forward',
    timestamp: 1,
    routingDecision: {
      dstIp: '203.0.113.10',
      winner,
      candidates: [
        { ...winner, destination: '10.0.0.0/24', matched: false, selectedByLpm: false },
        winner,
      ],
      explanation: '',
    },
  } as PacketHop;
}

let container: HTMLDivElement;
let root: Root;

function render() {
  act(() => root.render(React.createElement(RouteTablePanel)));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  mocks.selectedHop = null;
});

const usedRows = () => container.querySelectorAll('[data-testid="route-table-row"][data-used]');

describe('RouteTablePanel — the row the current hop used', () => {
  it('TC-LESSON-ROUTE-ROW: marks the matching row and says why when the hop is at that router', () => {
    mocks.selectedHop = routerHop('r1');
    render();

    expect(usedRows()).toHaveLength(1);
    expect(usedRows()[0]?.textContent).toContain('203.0.113.0/24');
    const verdict = container.querySelector('[data-testid="route-table-verdict"]');
    expect(verdict?.textContent).toContain('Packet to 203.0.113.10:');
    expect(verdict?.textContent).toContain('Matched 203.0.113.0/24 via direct');
  });

  it('marks nothing when no hop is selected', () => {
    render();
    expect(usedRows()).toHaveLength(0);
    expect(container.querySelector('[data-testid="route-table-verdict"]')).toBeNull();
  });

  it('marks nothing when the current hop is at another device', () => {
    mocks.selectedHop = routerHop('switch-1');
    render();
    expect(usedRows()).toHaveLength(0);
  });
});
