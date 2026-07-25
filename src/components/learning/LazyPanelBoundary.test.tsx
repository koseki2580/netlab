/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyPanelBoundary } from './LazyPanelBoundary';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

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

function Boom(): never {
  throw new Error('chunk 404');
}

describe('LazyPanelBoundary', () => {
  it('shows an alert instead of letting a failed panel escape into the host app', () => {
    // React logs the caught error; silence it so the suite output stays readable.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() =>
      root?.render(
        <LazyPanelBoundary onRetry={() => {}}>
          <Boom />
        </LazyPanelBoundary>,
      ),
    );
    const alert = container?.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('could not be loaded');
    spy.mockRestore();
  });

  it('asks the parent for a fresh import on retry (React caches a rejected lazy)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn();
    act(() =>
      root?.render(
        <LazyPanelBoundary onRetry={onRetry}>
          <Boom />
        </LazyPanelBoundary>,
      ),
    );
    const button = container?.querySelector('button') as HTMLButtonElement;
    act(() => button.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
    expect(onRetry).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
