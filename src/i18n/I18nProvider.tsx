import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { I18nContext } from './I18nContext';
import { createTranslator } from './createTranslator';
import { en } from './locales/en';
import { isLazyLocale, lazyCatalog, preloadLocale, subscribeLazyLocales } from './lazyLocales';
import type { Catalog, I18nContextValue } from './types';

export interface I18nProviderProps {
  readonly locale?: string;
  readonly catalog?: Catalog;
  readonly children: ReactNode;
}

/**
 * Provides `useI18n()` to its children. English renders at once. A built-in
 * catalogue that loads on demand (`ja`, REQ-356) renders at once when it is
 * already loaded (`preloadLocale`). Until then, on a first render the children
 * are not rendered, so no English frame shows; on a switch they stay mounted in
 * the language they had. If it cannot load they render in English.
 * A `catalog` passed in is used as given, at once.
 */
export function I18nProvider({ locale = 'en', catalog, children }: I18nProviderProps) {
  const lazy = !catalog && isLazyLocale(locale);
  const snapshot = () => (lazy ? lazyCatalog(locale) : undefined);
  const loadedLazy = useSyncExternalStore(subscribeLazyLocales, snapshot, snapshot);

  useEffect(() => {
    if (lazy && loadedLazy === undefined) void preloadLocale(locale);
  }, [lazy, loadedLazy, locale]);

  const resolved: Catalog | undefined =
    catalog ?? (lazy ? (loadedLazy ?? (loadedLazy === null ? en : undefined)) : en);

  const value = useMemo<I18nContextValue | null>(
    () => (resolved ? { locale, t: createTranslator(locale, resolved) } : null),
    [locale, resolved],
  );

  // A switch keeps the language shown until the new one arrives: the children
  // stay mounted, with their state.
  const shown = useRef<I18nContextValue | null>(null);
  if (value) shown.current = value;
  const current = value ?? shown.current;

  if (!current) return null;
  return <I18nContext.Provider value={current}>{children}</I18nContext.Provider>;
}
