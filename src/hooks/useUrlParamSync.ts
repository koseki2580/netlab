import { useEffect } from 'react';

/**
 * Two-way bind a single value to a URL search parameter without causing
 * a navigation event. On mount, callers should already have hydrated
 * their state from the URL (use {@link readUrlParam} for that). On
 * value change, the param is rewritten via `history.replaceState`.
 *
 * The hook is intentionally tiny — it does not own state. Compose it
 * with `useState` in the caller.
 *
 * @param key — URL search-param name (e.g. `'palette'`).
 * @param value — current value. Falsy values clear the param.
 * @param options.defaultValue — when `value === defaultValue`, the param
 *   is removed so shareable URLs stay clean.
 */
export function useUrlParamSync(
  key: string,
  value: string | null | undefined,
  options?: { defaultValue?: string },
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const next =
      value == null ||
      value === '' ||
      (options?.defaultValue != null && value === options.defaultValue)
        ? null
        : value;
    const current = url.searchParams.get(key);
    if (current === next) return;
    if (next === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, next);
    }
    window.history.replaceState(window.history.state, '', url.toString());
  }, [key, value, options?.defaultValue]);
}

/**
 * Read a URL param once (e.g. during initial state hydration). Returns
 * `null` when the param is absent or the runtime has no `window`.
 */
export function readUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URL(window.location.href).searchParams.get(key);
}
