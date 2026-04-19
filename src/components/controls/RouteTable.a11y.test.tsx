/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const netlabContextMock = vi.hoisted(() => ({
  topology: {
    nodes: [{ id: 'r1', type: 'netlab-node', data: { role: 'router', label: 'Router 1' } }],
    edges: [],
  },
  routeTable: new Map([
    [
      'r1',
      [
        { destination: '10.0.0.0/24', nextHop: 'direct', protocol: 'connected', adminDistance: 0 },
        { destination: '0.0.0.0/0', nextHop: '192.168.1.1', protocol: 'static', adminDistance: 1 },
      ],
    ],
  ]),
  areas: [],
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => netlabContextMock,
}));

import { RouteTablePanel } from './RouteTable';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(React.createElement(RouteTablePanel));
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('RouteTable a11y', () => {
  it('renders a <table> element', () => {
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('table has a <caption>', () => {
    const caption = container.querySelector('caption');
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toMatch(/Route table for/i);
  });

  it('column headers have scope="col"', () => {
    const ths = container.querySelectorAll('th[scope="col"]');
    expect(ths.length).toBe(3);
  });
});
