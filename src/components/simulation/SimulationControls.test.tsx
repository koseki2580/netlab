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
