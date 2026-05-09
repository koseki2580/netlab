import { createContext } from 'react';
import { createTranslator } from './createTranslator';
import { en } from './locales/en';
import type { I18nContextValue } from './types';

export const DEFAULT_I18N_VALUE: I18nContextValue = {
  locale: 'en',
  t: createTranslator('en', en),
};

export const I18nContext = createContext<I18nContextValue>(DEFAULT_I18N_VALUE);
