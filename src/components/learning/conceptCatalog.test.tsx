/* @vitest-environment jsdom */
/**
 * REQ-365 — the concept checks' Japanese strings load only for a Japanese page,
 * and the panel shows no English before them (TC-1734).
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';

it('renders nothing on a Japanese page until its strings arrive, then Japanese (TC-1734)', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  const { I18nProvider } = await import('../../i18n/I18nProvider');
  const { default: Panel } = await import('./ConceptCheckPanelInner');
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() =>
    root.render(
      <I18nProvider locale="ja">
        <Panel />
      </I18nProvider>,
    ),
  );
  expect(container.textContent).not.toContain('Protocol Concept Check');
  await vi.waitFor(() => expect(container.textContent).toContain('プロトコルの理解度チェック'));
  act(() => root.unmount());
});

/** A fresh module graph: no concept chunk loaded yet. */
async function freshPanel() {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  const { I18nProvider } = await import('../../i18n/I18nProvider');
  const { default: Panel } = await import('./ConceptCheckPanelInner');
  const { conceptChunk } = await import('./conceptCatalog');
  const { createReviewStore } = await import('../../learning/review');
  const { createMemoryProgressStorage } = await import('../../progress');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const store = createReviewStore(createMemoryProgressStorage());
  return { I18nProvider, Panel, conceptChunk, container, root, store };
}

it('TC-2276: a deck session draws nothing until its chunk is loaded, and loads no other group', async () => {
  const { I18nProvider, Panel, conceptChunk, container, root, store } = await freshPanel();
  act(() =>
    root.render(
      <I18nProvider locale="en">
        <Panel reviewStore={store} deckId="bgp" />
      </I18nProvider>,
    ),
  );
  expect(container.textContent).toBe('');
  await vi.waitFor(() =>
    expect(container.querySelector('[data-testid="concept-check-prompt"]')?.textContent).toBe(
      'BGP is the protocol that…',
    ),
  );
  expect(conceptChunk('en', 'routing')).toBeDefined();
  expect(conceptChunk('en', 'l2')).toBeUndefined();
  expect(conceptChunk('ja', 'routing')).toBeUndefined();
  act(() => root.unmount());
  container.remove();
});

it('TC-2277: a review session draws nothing until every chunk its queue needs is loaded', async () => {
  const { I18nProvider, Panel, conceptChunk, container, root, store } = await freshPanel();
  store.save({ 'arp:q1': { box: 1, dueAt: 0 }, 'bgp:q1': { box: 1, dueAt: 0 } });
  act(() =>
    root.render(
      <I18nProvider locale="ja">
        <Panel reviewStore={store} />
      </I18nProvider>,
    ),
  );
  // The picker needs only the core chunk.
  await vi.waitFor(() =>
    expect(container.querySelector('[data-testid="concept-check-review"]')).not.toBeNull(),
  );
  expect(conceptChunk('ja', 'l2')).toBeUndefined();
  expect(conceptChunk('ja', 'routing')).toBeUndefined();
  const review = container.querySelector<HTMLElement>('[data-testid="concept-check-review"]')!;
  act(() => review.click());
  expect(container.textContent).toBe('');
  await vi.waitFor(() =>
    expect(container.querySelector('[data-testid="concept-check-prompt"]')).not.toBeNull(),
  );
  expect(conceptChunk('ja', 'l2')).toBeDefined();
  expect(conceptChunk('ja', 'routing')).toBeDefined();
  expect(container.textContent).not.toMatch(/learning\.concept\./);
  act(() => root.unmount());
  container.remove();
});
