/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const netlabContextMock = vi.hoisted(() => ({
  topology: { nodes: [], edges: [] },
  routeTable: new Map(),
  areas: [
    { id: 'a1', type: 'private', name: 'LAN', subnet: '10.0.0.0/24' },
    { id: 'a2', type: 'dmz', name: 'DMZ', subnet: '192.168.1.0/24' },
  ],
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => netlabContextMock,
}));

import { AreaLegend } from './AreaLegend';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(React.createElement(AreaLegend));
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('AreaLegend a11y', () => {
  it('renders a list with role="list"', () => {
    expect(container.querySelector('[role="list"]')).not.toBeNull();
  });

  it('each area is a listitem', () => {
    const items = container.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(2);
  });

  it('color swatches are aria-hidden', () => {
    const swatches = container.querySelectorAll('[aria-hidden="true"]');
    expect(swatches.length).toBe(2);
  });
});
