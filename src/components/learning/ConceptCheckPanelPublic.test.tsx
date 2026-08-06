/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReviewStore } from '../../learning/review';
import { createMemoryProgressStorage } from '../../progress';
// The PUBLIC export (a React.lazy wrapper) — the other suite renders the inner
// panel directly, so nothing else exercises the shipped component's own wiring.
import { ConceptCheckPanel } from './ConceptCheckPanel';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let store = createReviewStore(createMemoryProgressStorage());

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  // Defence in depth: every test here injects a memory store, but jsdom shares one
  // localStorage across the file, and a panel rendered WITHOUT `reviewStore` writes
  // there (verified) — so a future test that forgets to inject would silently leak
  // spaced-repetition state into the ones after it.
  localStorage.clear();
  store = createReviewStore(createMemoryProgressStorage());
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

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) ?? null;
}

async function renderPublic() {
  await act(async () => {
    root?.render(<ConceptCheckPanel reviewStore={store} />);
  });
  // Wait for the real dynamic import to resolve, then let React commit.
  await act(async () => {
    await import('./ConceptCheckPanelInner');
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('ConceptCheckPanel (public export)', () => {
  it('resolves its lazy chunk and renders the picker', async () => {
    await renderPublic();
    expect(testid('concept-check-picker')).not.toBeNull();
  });

  it('retries with a fresh import after the chunk fails', async () => {
    // React caches a rejected lazy forever, so the retry only works if the shipped
    // component mints a NEW lazy (its useMemo must key on the attempt counter).
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    const failOnce = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('chunk 404');
      return import('./ConceptCheckPanelInner');
    });
    await act(async () => {
      root?.render(<ConceptCheckPanel reviewStore={store} importInner={failOnce} />);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container?.querySelector('[role="alert"]')).not.toBeNull();

    const retry = container?.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(attempts).toBe(2);
    expect(testid('concept-check-picker')).not.toBeNull();
    spy.mockRestore();
  });

  it('forwards reviewStore to the lazy panel instead of dropping it', async () => {
    // Without `{...props}` the panel silently falls back to localStorage, so a
    // consumer's injected store would never see a grade.
    await renderPublic();
    act(() => {
      (testid('concept-check-deck-arp') as HTMLElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true, button: 0 }),
      );
    });
    act(() => {
      (testid('concept-check-option-0') as HTMLElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true, button: 0 }),
      );
    });
    expect(Object.keys(store.load())).toHaveLength(1);
  });
});
