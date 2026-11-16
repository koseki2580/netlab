/**
 * Vitest setup: load the Japanese catalogue before any test renders, so a
 * provider with `locale="ja"` renders Japanese at once, as an app that calls
 * `preloadLocale` does (REQ-356). Tests of the loading itself start from a
 * fresh module graph (`vi.resetModules()`).
 */
import { preloadLocale } from '../i18n/lazyLocales';

await preloadLocale('ja');
