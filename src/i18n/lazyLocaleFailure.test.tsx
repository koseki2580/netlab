/* @vitest-environment jsdom */
/**
 * REQ-356 — a catalogue that cannot be loaded leaves the page in English,
 * with one warning (TC-1493).
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';

vi.mock('./locales/ja', () => {
  throw new Error('offline');
});

it('renders the children in English and warns once when the Japanese catalogue fails to load (TC-1493)', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.resetModules();
  const { I18nProvider, useI18n } = await import('./index');
  function Probe() {
    return <span>{useI18n().t('simulation.dropCard.heading')}</span>;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => {
    root.render(
      <I18nProvider locale="ja">
        <Probe />
      </I18nProvider>,
    );
  });
  await vi.waitFor(() => expect(container.textContent).toBe('drop event'));
  const loadWarnings = warn.mock.calls.filter((call) => String(call.join(' ')).includes('ja'));
  expect(loadWarnings).toHaveLength(1);
  act(() => root.unmount());
});
