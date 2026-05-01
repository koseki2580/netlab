import type { ParentOrigin } from './protocol';

function asArray(origin: ParentOrigin | undefined): readonly string[] {
  if (origin === undefined) return [];
  return typeof origin === 'string' ? [origin] : origin;
}

function toValidOrigin(value: string): string | null {
  if (value === '*') return null;

  try {
    const url = new URL(value);
    const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
    const hasOnlyOrigin = url.pathname === '/' && url.search === '' && url.hash === '';
    return isHttp && hasOnlyOrigin ? url.origin : null;
  } catch {
    return null;
  }
}

export function normalizeParentOrigins(origin: ParentOrigin | undefined): string[] {
  const normalized: string[] = [];
  for (const entry of asArray(origin)) {
    const valid = toValidOrigin(entry);
    if (valid && !normalized.includes(valid)) {
      normalized.push(valid);
    }
  }
  return normalized;
}

export function validateOrigin(actual: string, whitelist: ParentOrigin | undefined): boolean {
  const actualOrigin = toValidOrigin(actual);
  if (!actualOrigin) return false;
  return normalizeParentOrigins(whitelist).includes(actualOrigin);
}
