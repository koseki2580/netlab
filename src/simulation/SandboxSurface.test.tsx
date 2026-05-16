/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { NetlabContext } from '../components/NetlabContext';
import { SimulationProvider } from './SimulationContext';
import { directTopology } from './__fixtures__/topologies';

const TOPOLOGY = directTopology();

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface RenderOptions {
  readonly viewportWidth?: number;
}

function setMatchMedia(narrow: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql: MediaQueryList & {
    __setMatches?: (matches: boolean) => void;
  } = {
    matches: narrow,
    media: '(max-width: 900px)',
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as (event: MediaQueryListEvent) => void);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as (event: MediaQueryListEvent) => void);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  (mql as MediaQueryList & { __setMatches: (matches: boolean) => void }).__setMatches = (
    matches: boolean,
  ) => {
    (mql as { matches: boolean }).matches = matches;
    const event = { matches } as MediaQueryListEvent;
    for (const listener of listeners) listener(event);
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return mql as MediaQueryList & { __setMatches: (matches: boolean) => void };
}

function renderSurface(options: RenderOptions = {}) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }
  if (options.viewportWidth !== undefined) {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: options.viewportWidth,
    });
  }

  act(() => {
    root?.render(
      <NetlabContext.Provider
        value={{
          topology: TOPOLOGY,
          routeTable: TOPOLOGY.routeTables,
          areas: TOPOLOGY.areas,
          hookEngine: new HookEngine(),
          sandboxEnabled: true,
        }}
      >
        <SimulationProvider>
          <div data-testid="user-children">user-children</div>
        </SimulationProvider>
      </NetlabContext.Provider>,
    );
  });
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
  vi.restoreAllMocks();
});

describe('SandboxSurface layout', () => {
  it('mounts as a flex row with a canvas-slot and sandbox-panel sibling in wide mode', () => {
    setMatchMedia(false);
    renderSurface({ viewportWidth: 1280 });

    const surface = container?.querySelector<HTMLElement>('[data-testid="sandbox-surface"]');
    expect(surface).not.toBeNull();
    expect(surface?.getAttribute('data-layout-mode')).toBe('wide');
    expect(surface?.style.flexDirection).toBe('row');

    const slot = surface?.querySelector<HTMLElement>('[data-testid="sandbox-canvas-slot"]');
    expect(slot).not.toBeNull();
    expect(slot?.style.flex).toMatch(/^1(\s|$)/);
    expect(slot?.style.minWidth).toBe('0px');

    expect(slot?.querySelector('[data-testid="user-children"]')).not.toBeNull();

    const panel = surface?.querySelector<HTMLElement>('[data-testid="sandbox-panel"]');
    expect(panel).not.toBeNull();
    expect(panel?.parentElement).toBe(surface);
    expect(panel?.previousElementSibling).toBe(slot ?? null);
  });

  it('mounts as a flex column with a bottom drawer panel when matchMedia matches narrow', () => {
    setMatchMedia(true);
    renderSurface({ viewportWidth: 800 });

    const surface = container?.querySelector<HTMLElement>('[data-testid="sandbox-surface"]');
    expect(surface?.getAttribute('data-layout-mode')).toBe('drawer');
    expect(surface?.style.flexDirection).toBe('column');

    const panel = surface?.querySelector<HTMLElement>('[data-testid="sandbox-panel"]');
    expect(panel?.getAttribute('data-layout-mode')).toBe('drawer');
    expect(panel?.style.flex).toBe('0 0 40vh');
    expect(panel?.style.width).toBe('100%');
  });

  it('flips layout-mode when the media query change fires', () => {
    const mql = setMatchMedia(false);
    renderSurface({ viewportWidth: 1280 });

    const surface = () => container?.querySelector<HTMLElement>('[data-testid="sandbox-surface"]');
    expect(surface()?.getAttribute('data-layout-mode')).toBe('wide');

    act(() => {
      mql.__setMatches(true);
    });
    expect(surface()?.getAttribute('data-layout-mode')).toBe('drawer');

    act(() => {
      mql.__setMatches(false);
    });
    expect(surface()?.getAttribute('data-layout-mode')).toBe('wide');
  });
});
