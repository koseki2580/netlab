/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetTranslatorWarnings } from './createTranslator';
import { I18nProvider } from './I18nProvider';
import { _resetSubstituteWarnings } from './substitute';
import { useI18n } from './useI18n';
import type { I18nContextValue } from './types';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let captured: I18nContextValue | null = null;

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function Capture() {
  captured = useI18n();
  return null;
}

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }
  act(() => {
    root?.render(ui);
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  captured = null;
  _resetTranslatorWarnings();
  _resetSubstituteWarnings();
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  captured = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  if (container) {
    container.remove();
    container = null;
  }
  vi.restoreAllMocks();
});

describe('I18nProvider + useI18n', () => {
  it('provides the default en locale when no provider is present', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Capture />);
    expect(captured?.locale).toBe('en');
    expect(typeof captured?.t).toBe('function');
  });

  it('returns the key as fallback when called without a registered catalog entry', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Capture />);
    expect(captured?.t('not.in.catalog')).toBe('not.in.catalog');
  });

  it('exposes the provided locale on the context value', () => {
    render(
      <I18nProvider locale="ja">
        <Capture />
      </I18nProvider>,
    );
    expect(captured?.locale).toBe('ja');
  });

  it('uses the supplied catalog for translation', () => {
    render(
      <I18nProvider locale="en" catalog={{ 'a.b': 'A B value' }}>
        <Capture />
      </I18nProvider>,
    );
    expect(captured?.t('a.b')).toBe('A B value');
  });

  it('substitutes placeholders supplied via params', () => {
    render(
      <I18nProvider locale="en" catalog={{ 'greet.user': 'hi {{name}}' }}>
        <Capture />
      </I18nProvider>,
    );
    expect(captured?.t('greet.user', { name: 'sam' })).toBe('hi sam');
  });

  it('falls back to en catalog when a non-en locale lacks the key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <I18nProvider locale="ja" catalog={{}}>
        <Capture />
      </I18nProvider>,
    );
    expect(captured?.t('missing.in.ja')).toBe('missing.in.ja');
    expect(warn).toHaveBeenCalled();
  });
});
