/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimulationState } from '../../types/simulation';

const simulationMock = vi.hoisted(() => ({
  engine: { play: vi.fn(), pause: vi.fn(), step: vi.fn(), reset: vi.fn() },
  state: { status: 'idle', traces: [], activeTraceIndex: 0 } as SimulationState,
  sendPacket: vi.fn(),
}));

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => simulationMock,
}));

const netlabContextMock = vi.hoisted(() => ({
  topology: {
    nodes: [
      { id: 'c1', type: 'netlab-node', data: { role: 'client', label: 'Client', ip: '10.0.0.1' } },
      { id: 's1', type: 'netlab-node', data: { role: 'server', label: 'Server', ip: '10.0.0.2' } },
    ],
    edges: [],
  },
  routeTable: new Map(),
  areas: [],
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => netlabContextMock,
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

describe('SimulationControls a11y', () => {
  it('all buttons have aria-label', () => {
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('has expected accessible names', () => {
    const labels = Array.from(container.querySelectorAll('button')).map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(labels).toContain('Send Packet');
    expect(labels).toContain('Play');
    expect(labels).toContain('Pause');
    expect(labels).toContain('Step Forward');
    expect(labels).toContain('Reset');
  });

  it('all buttons have netlab-focus-ring class', () => {
    container.querySelectorAll('button').forEach((btn) => {
      expect(btn.classList.contains('netlab-focus-ring')).toBe(true);
    });
  });
});
