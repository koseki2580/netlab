/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NARROW_BREAKPOINT, useViewport, type ViewportInfo } from './useViewport';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let originalWidth: number;
let originalHeight: number;
let originalRaf: typeof window.requestAnimationFrame;
let originalCancelRaf: typeof window.cancelAnimationFrame;

function setViewportSize(width: number, height = 800): void {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  originalWidth = window.innerWidth;
  originalHeight = window.innerHeight;
  // Run rAF callbacks synchronously so resize updates are deterministic.
  originalRaf = window.requestAnimationFrame;
  originalCancelRaf = window.cancelAnimationFrame;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  setViewportSize(originalWidth, originalHeight);
  window.requestAnimationFrame = originalRaf;
  window.cancelAnimationFrame = originalCancelRaf;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

function renderHook(): { current: ViewportInfo } {
  const result: { current: ViewportInfo } = { current: { width: 0, height: 0, isNarrow: false } };
  function Probe() {
    result.current = useViewport();
    return null;
  }
  act(() => root?.render(<Probe />));
  return result;
}

describe('useViewport', () => {
  it('reports width/height from the window on mount', () => {
    setViewportSize(1280, 720);
    const result = renderHook();
    expect(result.current.width).toBe(1280);
    expect(result.current.height).toBe(720);
    expect(result.current.isNarrow).toBe(false);
  });

  it('treats the breakpoint as the narrow boundary (< 900)', () => {
    setViewportSize(NARROW_BREAKPOINT - 1);
    expect(renderHook().current.isNarrow).toBe(true);
  });

  it('is not narrow exactly at the breakpoint', () => {
    setViewportSize(NARROW_BREAKPOINT);
    expect(renderHook().current.isNarrow).toBe(false);
  });

  it('is not narrow above the breakpoint', () => {
    setViewportSize(NARROW_BREAKPOINT + 1);
    expect(renderHook().current.isNarrow).toBe(false);
  });

  it('updates on window resize', () => {
    setViewportSize(1200);
    const result = renderHook();
    expect(result.current.isNarrow).toBe(false);

    act(() => {
      setViewportSize(375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.width).toBe(375);
    expect(result.current.isNarrow).toBe(true);
  });
});
