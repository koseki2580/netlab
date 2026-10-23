/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaxGraphControls } from './MaxGraphControls';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const handlers = () => ({
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onZoomActual: vi.fn(),
  onFit: vi.fn(),
  onToggleGrid: vi.fn(),
});

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;
}

function click(id: string) {
  act(() => testid(id)!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
});

describe('MaxGraphControls', () => {
  it('routes each control to its own action', () => {
    const h = handlers();
    act(() => root?.render(<MaxGraphControls {...h} gridEnabled />));

    click('maxgraph-zoom-in');
    click('maxgraph-zoom-out');
    click('maxgraph-zoom-reset');
    click('maxgraph-fit');
    click('maxgraph-grid');

    // Each control must be wired to its own callback — a copy-paste slip that
    // points two buttons at one action is exactly what this catches.
    expect(h.onZoomIn).toHaveBeenCalledTimes(1);
    expect(h.onZoomOut).toHaveBeenCalledTimes(1);
    expect(h.onZoomActual).toHaveBeenCalledTimes(1);
    expect(h.onFit).toHaveBeenCalledTimes(1);
    expect(h.onToggleGrid).toHaveBeenCalledTimes(1);
  });

  it('gives every control a name, not just a symbol', () => {
    // "+" and "−" mean nothing to a screen reader on their own.
    act(() => root?.render(<MaxGraphControls {...handlers()} gridEnabled />));
    for (const [id, name] of [
      ['maxgraph-zoom-in', 'Zoom in'],
      ['maxgraph-zoom-out', 'Zoom out'],
      ['maxgraph-zoom-reset', 'Reset zoom to 100%'],
      ['maxgraph-fit', 'Fit the diagram in view'],
      ['maxgraph-grid', 'Snap to grid'],
    ] as const) {
      expect(testid(id)!.getAttribute('aria-label'), id).toBe(name);
    }
  });

  it('reports the grid state through aria-pressed, not only colour', () => {
    act(() => root?.render(<MaxGraphControls {...handlers()} gridEnabled />));
    expect(testid('maxgraph-grid')!.getAttribute('aria-pressed')).toBe('true');
    act(() => root?.render(<MaxGraphControls {...handlers()} gridEnabled={false} />));
    expect(testid('maxgraph-grid')!.getAttribute('aria-pressed')).toBe('false');
  });
});
