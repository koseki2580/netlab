/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationOverlayDock } from './SimulationOverlayDock';

vi.mock('../controls/RouteTable', async () => {
  const React = await import('react');

  return {
    RouteTablePanel: () =>
      React.createElement('div', { 'data-testid': 'route-table-panel' }, 'route-table'),
  };
});

vi.mock('./PacketViewer', async () => {
  const React = await import('react');

  return {
    PacketViewerPanel: () =>
      React.createElement('div', { 'data-testid': 'packet-viewer-panel' }, 'packet-viewer'),
  };
});

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

function currentStack() {
  const stack = container?.firstElementChild;
  if (!(stack instanceof HTMLDivElement)) {
    throw new Error('SimulationOverlayDock root was not rendered');
  }

  return stack;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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
});

describe('SimulationOverlayDock', () => {
  it('stacks the route table above the packet viewer in one top-right overlay dock', () => {
    render(<SimulationOverlayDock showRouteTable />);

    const stack = currentStack();

    expect(stack.style.position).toBe('absolute');
    expect(stack.style.top).toBe('12px');
    expect(stack.style.right).toBe('12px');
    expect(stack.style.display).toBe('flex');
    expect(stack.style.flexDirection).toBe('column');
    expect(stack.style.gap).toBe('12px');
    expect(stack.style.alignItems).toBe('flex-end');
    expect(stack.querySelector('[data-testid="route-table-panel"]')).not.toBeNull();
    expect(stack.querySelector('[data-testid="packet-viewer-panel"]')).not.toBeNull();
    expect(stack.children).toHaveLength(2);
  });

  it('keeps rendering the packet viewer when the route table is disabled', () => {
    render(<SimulationOverlayDock showRouteTable={false} />);

    const stack = currentStack();

    expect(stack.querySelector('[data-testid="route-table-panel"]')).toBeNull();
    expect(stack.querySelector('[data-testid="packet-viewer-panel"]')).not.toBeNull();
    expect(stack.children).toHaveLength(1);
  });
});
