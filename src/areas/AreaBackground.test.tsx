/* @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabUIContext } from '../components/NetlabUIContext';
import { AreaBackground } from './AreaBackground';

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

describe('AreaBackground', () => {
  it('renders a highlighted outline when the area is active in UI context', () => {
    act(() => {
      root = createRoot(container);
      root.render(
        <NetlabUIContext.Provider
          value={
            {
              selectedNodeId: null,
              setSelectedNodeId: vi.fn(),
              highlightedAreaId: 'a1',
              setHighlightedAreaId: vi.fn(),
            } as never
          }
        >
          {React.createElement(AreaBackground, {
            data: {
              areaId: 'a1',
              name: 'LAN',
              type: 'private',
              width: 300,
              height: 180,
            },
          } as never)}
        </NetlabUIContext.Provider>,
      );
    });

    const background = container.firstElementChild as HTMLElement;

    expect(background.style.outline).toBe('2px solid var(--netlab-accent-cyan)');
    expect(background.style.opacity).toBe('0.95');
  });
});
