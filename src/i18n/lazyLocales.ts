import { logger } from '../utils/logger';
import type { Catalog } from './types';

/**
 * Built-in catalogues that load on demand (REQ-356). English stays bundled:
 * it is the fallback for every missing key and must render at once.
 */
const LOADERS: Readonly<Record<string, () => Promise<Catalog>>> = {
  ja: () => import('./locales/ja').then((module) => module.ja),
};

/** A loaded catalogue, or `null` when loading it failed (the page stays in English). */
const loaded = new Map<string, Catalog | null>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

/** Whether `locale` is a built-in catalogue that loads on demand. */
export function isLazyLocale(locale: string): boolean {
  return Object.prototype.hasOwnProperty.call(LOADERS, locale);
}

/** The catalogue of a lazy locale: loaded, `null` if it failed, `undefined` while not yet loaded. */
export function lazyCatalog(locale: string): Catalog | null | undefined {
  return loaded.get(locale);
}

/**
 * Load a built-in locale's catalogue. Once it resolves, a provider with that
 * locale renders in it at once, on the client and in server rendering alike.
 * Resolves at once for English, for a locale already loaded, and for one with
 * no built-in catalogue.
 */
export function preloadLocale(locale: string): Promise<void> {
  const load = LOADERS[locale];
  if (!load || loaded.has(locale)) return Promise.resolve();
  let loading = pending.get(locale);
  if (!loading) {
    loading = load()
      .then(
        (catalog) => {
          loaded.set(locale, catalog);
        },
        (error: unknown) => {
          logger.warn(`could not load the "${locale}" catalogue; showing English`, error);
          loaded.set(locale, null);
        },
      )
      .finally(() => {
        pending.delete(locale);
        for (const listener of listeners) listener();
      });
    pending.set(locale, loading);
  }
  return loading;
}

/** Be told when a lazy catalogue finishes loading (for `useSyncExternalStore`). */
export function subscribeLazyLocales(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
