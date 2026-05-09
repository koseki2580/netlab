import { en } from './locales/en';
import { substitute } from './substitute';
import type { Catalog, TranslatorFn } from './types';

const warnedMissingKeys = new Set<string>();

function warnMissingKey(scope: string, key: string, message: string): void {
  const id = `${scope}::${key}`;
  if (warnedMissingKeys.has(id)) return;
  warnedMissingKeys.add(id);
  if (typeof console !== 'undefined') {
    console.warn(message);
  }
}

export function createTranslator(locale: string, catalog: Catalog): TranslatorFn {
  return (key, params) => {
    let template = catalog[key];
    if (template === undefined && locale !== 'en') {
      warnMissingKey(
        locale,
        key,
        `[netlab/i18n] missing key '${key}' in locale '${locale}'; falling back to en`,
      );
      template = en[key];
    }
    if (template === undefined) {
      warnMissingKey('en', key, `[netlab/i18n] missing key '${key}' in en catalog`);
      return key;
    }
    return substitute(template, params);
  };
}

export function _resetTranslatorWarnings(): void {
  warnedMissingKeys.clear();
}
