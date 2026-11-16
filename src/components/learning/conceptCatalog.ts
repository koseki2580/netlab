import { logger } from '../../utils/logger';
import type { Catalog } from '../../i18n/types';

/**
 * The concept checks' Japanese strings, loaded only for a Japanese page: the
 * English ones ride in the panel's chunk as the fallback, the Japanese ones in
 * a chunk of their own (REQ-365, as REQ-356 does for the app's catalogue).
 */
let japanese: Catalog | null = null;
let loading: Promise<void> | null = null;

/** The Japanese strings once loaded; `null` until then. */
export const conceptJapanese = (): Catalog | null => japanese;

/** Load the Japanese strings; a failure leaves the panel in English, with one warning. */
export function loadConceptJapanese(): Promise<void> {
  loading ??= import('../../i18n/locales/ja/conceptCheck').then(
    (module) => {
      japanese = module.conceptCheck;
    },
    (error: unknown) => {
      logger.warn('could not load the Japanese concept checks; showing English', error);
      japanese = {};
    },
  );
  return loading;
}
