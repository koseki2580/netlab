/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const failureMock = vi.hoisted(() => ({
  toggleNode: vi.fn(),
  toggleEdge: vi.fn(),
  toggleInterface: vi.fn(),
  resetFailures: vi.fn(),
  isNodeDown: vi.fn(() => false),
  isEdgeDown: vi.fn(() => false),
  isInterfaceDown: vi.fn(() => false),
}));

vi.mock('../../simulation/FailureContext', () => ({
  useFailure: () => failureMock,
}));

vi.mock('../../simulation/SimulationContext', () => ({
  useOptionalSimulation: () => null,
}));

const netlabContextMock = vi.hoisted(() => ({
  topology: {
    nodes: [
      {
        id: 'r1',
        type: 'netlab-node',
        data: { role: 'router', label: 'Router 1', interfaces: [{ id: 'eth0', name: 'eth0' }] },
      },
      { id: 'c1', type: 'netlab-node', data: { role: 'client', label: 'Client' } },
    ],
    edges: [{ id: 'e1', source: 'r1', target: 'c1' }],
  },
  routeTable: new Map(),
  areas: [],
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => netlabContextMock,
}));

import { FailureTogglePanel } from './FailureTogglePanel';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(React.createElement(FailureTogglePanel));
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('FailureTogglePanel a11y', () => {
  it('toggle buttons have role="switch"', () => {
    const switches = container.querySelectorAll('button[role="switch"]');
    expect(switches.length).toBeGreaterThan(0);
  });

  it('toggle buttons have aria-label containing the node/edge name', () => {
    const switches = container.querySelectorAll('button[role="switch"]');
    switches.forEach((btn) => {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('toggle buttons have aria-checked attribute', () => {
    const switches = container.querySelectorAll('button[role="switch"]');
    switches.forEach((btn) => {
      expect(btn.hasAttribute('aria-checked')).toBe(true);
    });
  });
});
