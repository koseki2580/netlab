/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const simulationMock = vi.hoisted(() => ({
  engine: {
    play: vi.fn(),
    pause: vi.fn(),
    step: vi.fn(),
    reset: vi.fn(),
    setHighlightMode: vi.fn(),
  },
  state: {
    status: 'idle',
    highlightMode: 'path',
    currentStep: -1,
    traces: [],
    currentTraceId: null,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  },
  sendPacket: vi.fn(),
}));

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => simulationMock,
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => ({
    topology: { nodes: [], edges: [] },
    routeTable: new Map(),
    areas: [],
  }),
}));

import { SimulationControls } from './SimulationControls';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(React.createElement(SimulationControls));
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('SimulationControls zones', () => {
  it('renders transport zone buttons with title attributes', () => {
    const titles = Array.from(container.querySelectorAll('button')).map((b) =>
      b.getAttribute('title'),
    );
    expect(titles).toContain('Play');
    expect(titles).toContain('Pause');
    expect(titles).toContain('Step Forward');
    expect(titles).toContain('Reset');
  });

  it('renders Send Packet button with title', () => {
    const titles = Array.from(container.querySelectorAll('button')).map((b) =>
      b.getAttribute('title'),
    );
    expect(titles).toContain('Send Packet');
  });

  it('renders inspect zone highlight toggle with title', () => {
    const btn = container.querySelector('[title="Highlight mode"]');
    expect(btn).toBeTruthy();
  });
});

describe('SimulationControls without the generic send', () => {
  it('TC-LESSON-NAT-KEEP: a lesson that sends with its own buttons gets no generic send, and the idle hint points at those buttons', () => {
    act(() => {
      root.render(<SimulationControls showSend={false} />);
    });
    expect(container.querySelector('[data-testid="demo-primary-action"]')).toBeNull();
    expect(container.textContent).toContain('Send with the lesson’s buttons to begin');
    const titles = Array.from(container.querySelectorAll('button')).map((b) =>
      b.getAttribute('title'),
    );
    expect(titles).toContain('Play');
    expect(titles).toContain('Reset');
  });
});

describe('SimulationControls for a beginner', () => {
  const hop = (step: number, nodeLabel: string, event: string, reason?: string) => ({
    step,
    nodeId: nodeLabel,
    nodeLabel,
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'TCP',
    event,
    timestamp: step,
    ...(reason ? { reason } : {}),
  });
  const load = (status: string, currentStep: number, traceStatus: string, hops: unknown[]) => {
    Object.assign(simulationMock.state, {
      status,
      currentStep,
      currentTraceId: 'p1',
      traces: [
        { packetId: 'p1', srcNodeId: 'Client', dstNodeId: 'Server', hops, status: traceStatus },
      ],
    });
    act(() => {
      root.render(<SimulationControls />);
    });
  };
  const button = (label: string) =>
    Array.from(container.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-label') === label,
    ) as HTMLButtonElement;
  const status = () => container.querySelector('[data-testid="sim-status"]')?.textContent;

  afterEach(() => {
    Object.assign(simulationMock.state, {
      status: 'idle',
      currentStep: -1,
      currentTraceId: null,
      traces: [],
    });
    vi.clearAllMocks();
  });

  it('TC-345: each transport button shows its name beside its icon', () => {
    expect(button('Play').textContent).toBe('▶ Play');
    expect(button('Pause').textContent).toBe('⏸ Pause');
    expect(button('Step Forward').textContent).toBe('→ Step Forward');
    expect(button('Reset').textContent).toBe('⟳ Reset');
    for (const b of [button('Play'), button('Pause'), button('Step Forward'), button('Reset')]) {
      expect(b.classList.contains('netlab-tap')).toBe(true);
    }
  });

  it('TC-344: after a send the status says how it ended and what to press next', () => {
    load('paused', -1, 'delivered', [hop(0, 'Client', 'create'), hop(1, 'Server', 'deliver')]);
    expect(status()).toBe(
      'Delivered: it ended at Server. Press → to retrace its path one device at a time.',
    );

    load('paused', -1, 'dropped', [hop(0, 'Client', 'create'), hop(1, 'R-1', 'drop', 'no-route')]);
    expect(status()).toContain('Dropped at R-1: no-route.');

    load('paused', 0, 'delivered', [hop(0, 'Client', 'create'), hop(1, 'Server', 'deliver')]);
    expect(status()).toBe('Step 1 of 2: Client (created)');
  });

  it('TC-340: play on a finished trace starts it again from the first device', () => {
    load('done', 1, 'delivered', [hop(0, 'Client', 'create'), hop(1, 'Server', 'deliver')]);
    expect(button('Play').disabled).toBe(false);

    act(() => button('Play').click());

    expect(simulationMock.engine.reset).toHaveBeenCalledTimes(1);
    expect(simulationMock.engine.play).toHaveBeenCalledTimes(1);
    expect(simulationMock.engine.reset.mock.invocationCallOrder[0]).toBeLessThan(
      simulationMock.engine.play.mock.invocationCallOrder[0] ?? 0,
    );
  });
});
