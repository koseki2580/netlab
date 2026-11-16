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
  await vi.waitFor(() => expect(container.textContent).toContain('プロトコル・コンセプトチェック'));
  act(() => root.unmount());
});
