/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabUIContext } from '../NetlabUIContext';

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
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('AreaLegend', () => {
  it('toggles the clicked area through NetlabUIContext', () => {
    const setHighlightedAreaId = vi.fn();

    act(() => {
      root = createRoot(container);
      root.render(
        <NetlabUIContext.Provider
          value={
            {
              selectedNodeId: null,
              setSelectedNodeId: vi.fn(),
              highlightedAreaId: null,
              setHighlightedAreaId,
            } as never
          }
        >
          <AreaLegend />
        </NetlabUIContext.Provider>,
      );
    });

    const firstArea = container.querySelector('[role="listitem"]') as HTMLElement;
    act(() => {
      firstArea.click();
    });

    expect(setHighlightedAreaId).toHaveBeenCalledWith('a1');
  });

  it('clears the highlight when the active area is clicked again', () => {
    const setHighlightedAreaId = vi.fn();

    act(() => {
      root = createRoot(container);
      root.render(
        <NetlabUIContext.Provider
          value={
            {
              selectedNodeId: null,
              setSelectedNodeId: vi.fn(),
              highlightedAreaId: 'a1',
              setHighlightedAreaId,
            } as never
          }
        >
          <AreaLegend />
        </NetlabUIContext.Provider>,
      );
    });

    const firstArea = container.querySelector('[role="listitem"]') as HTMLElement;
    act(() => {
      firstArea.click();
    });

    expect(setHighlightedAreaId).toHaveBeenCalledWith(null);
  });
});
