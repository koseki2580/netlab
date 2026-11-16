/* @vitest-environment jsdom */
/**
 * REQ-356 — the Japanese catalogue loads on demand, and a Japanese page never
 * shows the library's English first (TC-1490, TC-1491, TC-1492, TC-1494).
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'simulation.dropCard.heading';
const EN = 'drop event';
const JA = 'パケットの破棄';

type I18n = typeof import('./index');

let root: Root | null = null;
let container: HTMLDivElement;
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

/** A fresh module graph: nothing loaded yet, as on a first visit. */
async function freshI18n(): Promise<I18n> {
  vi.resetModules();
  return import('./index');
}

function probe(i18n: I18n) {
  return function Probe() {
    const { t } = i18n.useI18n();
    return <span>{t(KEY)}</span>;
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
});

describe('a Japanese provider before the catalogue is loaded (TC-1490)', () => {
  it('shows nothing of its children while loading, then Japanese, and never English', async () => {
    const i18n = await freshI18n();
    const Probe = probe(i18n);
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(container.textContent ?? ''));
    observer.observe(container, { childList: true, subtree: true, characterData: true });

    act(() => {
      root?.render(
        <i18n.I18nProvider locale="ja">
          <Probe />
        </i18n.I18nProvider>,
      );
    });
    expect(container.textContent).toBe('');

    await vi.waitFor(() => expect(container.textContent).toBe(JA));
    observer.disconnect();
    expect(seen.join('|')).not.toContain(EN);
  });
});

describe('after preloadLocale (TC-1491)', () => {
  it('renders Japanese on the first client render', async () => {
    const i18n = await freshI18n();
    await i18n.preloadLocale('ja');
    const Probe = probe(i18n);
    act(() => {
      root?.render(
        <i18n.I18nProvider locale="ja">
          <Probe />
        </i18n.I18nProvider>,
      );
    });
    expect(container.textContent).toBe(JA);
  });

  it('renders Japanese when rendered on a server', async () => {
    const i18n = await freshI18n();
    await i18n.preloadLocale('ja');
    const Probe = probe(i18n);
    const html = renderToString(
      <i18n.I18nProvider locale="ja">
        <Probe />
      </i18n.I18nProvider>,
    );
    expect(html).toContain(JA);
  });
});

describe('a catalogue passed in (TC-1492)', () => {
  it('renders Japanese at once with `catalog={ja}` from `locales/ja`', async () => {
    const i18n = await freshI18n();
    const { ja } = await import('./locales/ja');
    const Probe = probe(i18n);
    act(() => {
      root?.render(
        <i18n.I18nProvider locale="ja" catalog={ja}>
          <Probe />
        </i18n.I18nProvider>,
      );
    });
    expect(container.textContent).toBe(JA);
  });
});

describe('English (TC-1494)', () => {
  it('renders English on the first render', async () => {
    const i18n = await freshI18n();
    const Probe = probe(i18n);
    act(() => {
      root?.render(
        <i18n.I18nProvider locale="en">
          <Probe />
        </i18n.I18nProvider>,
      );
    });
    expect(container.textContent).toBe(EN);
  });
});

describe('switching from English to Japanese (TC-1497)', () => {
  it('keeps the children mounted in English until the Japanese arrives, then shows Japanese', async () => {
    const i18n = await freshI18n();
    const { useState } = await import('react');
    let mounts = 0;
    function Counter() {
      const { t } = i18n.useI18n();
      const [count, setCount] = useState(() => {
        mounts += 1;
        return 41;
      });
      return (
        <button type="button" onClick={() => setCount(count + 1)}>
          {t(KEY)} {count}
        </button>
      );
    }
    const page = (locale: string) => (
      <i18n.I18nProvider locale={locale}>
        <Counter />
      </i18n.I18nProvider>
    );
    act(() => root?.render(page('en')));
    act(() => container.querySelector('button')?.click());
    expect(container.textContent).toBe(`${EN} 42`);

    act(() => root?.render(page('ja')));
    expect(container.textContent).toBe(`${EN} 42`);
    await vi.waitFor(() => expect(container.textContent).toBe(`${JA} 42`));
    expect(mounts).toBe(1);
  });
});
