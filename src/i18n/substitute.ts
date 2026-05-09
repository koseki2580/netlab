import type { TranslatorParams } from './types';

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

const warnedPlaceholders = new Set<string>();

function warnMissingPlaceholder(template: string, name: string): void {
  const id = `${template}::${name}`;
  if (warnedPlaceholders.has(id)) return;
  warnedPlaceholders.add(id);
  if (typeof console !== 'undefined') {
    console.warn(`[netlab/i18n] missing placeholder param '${name}' for template "${template}"`);
  }
}

export function substitute(template: string, params?: TranslatorParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER_RE, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      const raw = params[name];
      return raw === undefined ? match : String(raw);
    }
    warnMissingPlaceholder(template, name);
    return match;
  });
}

export function _resetSubstituteWarnings(): void {
  warnedPlaceholders.clear();
}
