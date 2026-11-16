/**
 * Vitest setup: load the Japanese catalogues (the app's and the concept checks') before any test renders, so a
 * provider with `locale="ja"` renders Japanese at once, as an app that calls
 * `preloadLocale` does (REQ-356). Tests of the loading itself start from a
 * fresh module graph (`vi.resetModules()`).
 */
import { loadConceptJapanese } from '../components/learning/conceptCatalog';
import { preloadLocale } from '../i18n/lazyLocales';

await preloadLocale('ja');
await loadConceptJapanese();
