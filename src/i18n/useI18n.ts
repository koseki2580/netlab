import { useContext } from 'react';
import { I18nContext } from './I18nContext';
import type { I18nContextValue } from './types';

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
