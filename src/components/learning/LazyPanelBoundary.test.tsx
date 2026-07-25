/* @vitest-environment jsdom */

import { Suspense, act, lazy, useMemo, useState } from 'react';
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

  it('recovers from a genuinely rejected dynamic import when retried', async () => {
    // The end-to-end contract: React caches a rejected lazy forever, so the retry
    // is only real if a *fresh* import runs and the panel then renders.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let calls = 0;
    const importer = () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error('chunk 404'))
        : Promise.resolve({ default: () => <div data-testid="loaded-panel">panel</div> });
    };

    function Host() {
      const [attempt, setAttempt] = useState(0);
      const Inner = useMemo(() => {
        void attempt;
        return lazy(importer);
      }, [attempt]);
      return (
        <LazyPanelBoundary onRetry={() => setAttempt((value) => value + 1)}>
          <Suspense fallback={null}>
            <Inner />
          </Suspense>
        </LazyPanelBoundary>
      );
    }

    await act(async () => {
      root?.render(<Host />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container?.querySelector('[role="alert"]')).not.toBeNull();

    const button = container?.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(calls).toBe(2);
    expect(container?.querySelector('[data-testid="loaded-panel"]')).not.toBeNull();
    spy.mockRestore();
  });
});
