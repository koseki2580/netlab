/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacketHop, RoutingDecision, SimulationState } from '../../types/simulation';
import { StepControls } from './StepControls';

const simulationMock = vi.hoisted(() => ({
  engine: {
    step: vi.fn(),
    reset: vi.fn(),
  },
  state: null as SimulationState | null,
}));

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => ({
    engine: simulationMock.engine,
    state: simulationMock.state,
  }),
}));

vi.mock('./TraceSelector', async () => {
  const React = await import('react');

  return {
    TraceSelector: () => React.createElement('div', null, 'TRACE SELECTOR'),
  };
});

function makeDecision(): RoutingDecision {
  return {
    dstIp: '203.0.113.10',
    winner: {
      destination: '203.0.113.0/24',
      nextHop: 'direct',
      metric: 0,
      protocol: 'static',
      adminDistance: 1,
      matched: true,
      selectedByLpm: true,
    },
    candidates: [
      {
        destination: '203.0.113.0/24',
        nextHop: 'direct',
        metric: 0,
        protocol: 'static',
        adminDistance: 1,
        matched: true,
        selectedByLpm: true,
      },
      {
        destination: '0.0.0.0/0',
        nextHop: '10.0.0.1',
        metric: 10,
        protocol: 'rip',
        adminDistance: 120,
        matched: true,
        selectedByLpm: false,
      },
    ],
    explanation: 'Matched 203.0.113.0/24 via direct (static, AD=1)',
  };
}

function makeHop(overrides: Partial<PacketHop>): PacketHop {
  return {
    step: 0,
    nodeId: 'client-1',
    nodeLabel: 'Client',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'TCP',
    event: 'create',
    timestamp: 1,
    ...overrides,
  };
}

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  const hops = [
    makeHop({ step: 0, nodeId: 'client-1', nodeLabel: 'Client', event: 'create' }),
    makeHop({
      step: 1,
      nodeId: 'router-1',
      nodeLabel: 'Router',
      event: 'forward',
      routingDecision: makeDecision(),
    }),
    makeHop({
      step: 2,
      nodeId: 'server-1',
      nodeLabel: 'Server',
      event: 'deliver',
    }),
  ];

  return {
    status: 'paused',
    traces: [
      {
        packetId: 'trace-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        hops,
        status: 'delivered',
      },
    ],
    currentTraceId: 'trace-1',
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
    ...overrides,
  };
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement = <StepControls />) {
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

function findButton(text: string) {
  return Array.from(container?.querySelectorAll('button') ?? []).find((button) =>
    button.textContent?.includes(text),
  );
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  simulationMock.engine.step.mockReset();
  simulationMock.engine.reset.mockReset();
  simulationMock.state = makeState();
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

describe('StepControls', () => {
  describe('initial state', () => {
    it('renders message when no trace loaded', () => {
      simulationMock.state = makeState({
        status: 'idle',
        traces: [],
        currentTraceId: null,
        currentStep: -1,
      });
      render();

      expect(container?.textContent).toContain('Send a packet to begin.');
    });

    it('renders Next Step and Reset buttons', () => {
      render();

      expect(findButton('Next Step')).toBeDefined();
      expect(findButton('Reset')).toBeDefined();
    });
  });

  describe('hop display', () => {
    it('shows hops up to currentStep', () => {
      simulationMock.state = makeState({ currentStep: 1 });
      render();

      expect(container?.textContent).toContain('Client');
      expect(container?.textContent).toContain('Router');
      expect(container?.textContent).not.toContain('Server');
    });

    it('highlights current hop', () => {
      simulationMock.state = makeState({ currentStep: 1 });
      render();

      expect(container?.innerHTML).toContain(
        'background: rgb(125, 211, 252); border: 2px solid rgb(125, 211, 252);',
      );
    });

    it('shows routing decision when present', () => {
      render();

      expect(container?.textContent).toContain('LPM ROUTING TABLE');
      expect(container?.textContent).toContain('Matched 203.0.113.0/24 via direct');
    });

    it('shows drop reason for dropped hops', () => {
      simulationMock.state = makeState({
        currentStep: 1,
        traces: [
          {
            packetId: 'trace-1',
            srcNodeId: 'client-1',
            dstNodeId: 'server-1',
            status: 'dropped',
            hops: [
              makeHop({ step: 0, nodeLabel: 'Client' }),
              makeHop({
                step: 1,
                nodeId: 'router-1',
                nodeLabel: 'Router',
                event: 'drop',
                reason: 'no-route',
              }),
            ],
          },
        ],
      });
      render();

      expect(container?.textContent).toContain('Drop reason: no-route');
    });
  });

  describe('button states', () => {
    it('Next Step disabled when status is idle', () => {
      simulationMock.state = makeState({ status: 'idle' });
      render();

      expect(findButton('Next Step')?.disabled).toBe(true);
    });

    it('Next Step disabled when status is done', () => {
      simulationMock.state = makeState({ status: 'done' });
      render();

      expect(findButton('Next Step')?.disabled).toBe(true);
    });

    it('Reset disabled when status is idle', () => {
      simulationMock.state = makeState({ status: 'idle' });
      render();

      expect(findButton('Reset')?.disabled).toBe(true);
    });

    it('Next Step enabled when status is paused', () => {
      simulationMock.state = makeState({ status: 'paused' });
      render();

      expect(findButton('Next Step')?.disabled).toBe(false);
    });
  });

  describe('RoutingTable', () => {
    it('renders column headers', () => {
      render();

      expect(container?.textContent).toContain('DESTINATION');
      expect(container?.textContent).toContain('NEXT HOP');
      expect(container?.textContent).toContain('PROTOCOL');
      expect(container?.textContent).toContain('AD');
      expect(container?.textContent).toContain('METRIC');
    });

    it('renders candidate routes with protocol and metrics', () => {
      render();

      expect(container?.textContent).toContain('203.0.113.0/24');
      expect(container?.textContent).toContain('static');
      expect(container?.textContent).toContain('rip');
      expect(container?.textContent).toContain('120');
    });

    it('highlights selected route', () => {
      render();

      expect(container?.textContent).toContain('MATCH ✓');
    });

    it('renders explanation text', () => {
      render();

      expect(container?.textContent).toContain('Matched 203.0.113.0/24 via direct (static, AD=1)');
    });
  });
});
