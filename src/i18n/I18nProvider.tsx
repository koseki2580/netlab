import { useMemo, type ReactNode } from 'react';
import { I18nContext } from './I18nContext';
import { createTranslator } from './createTranslator';
import { en } from './locales/en';
import { ja } from './locales/ja';
import type { Catalog, I18nContextValue } from './types';

export interface I18nProviderProps {
  readonly locale?: string;
  readonly catalog?: Catalog;
  readonly children: ReactNode;
}

const BUILT_IN_CATALOGS: Record<string, Catalog> = {
  en,
  ja,
};

export function I18nProvider({ locale = 'en', catalog, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const resolvedCatalog = catalog ?? BUILT_IN_CATALOGS[locale] ?? en;
    return {
      locale,
      t: createTranslator(locale, resolvedCatalog),
    };
  }, [locale, catalog]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
