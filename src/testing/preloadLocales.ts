/**
 * Vitest setup: load the Japanese catalogue and every concept-check chunk in
 * both locales before any test renders, so a provider with `locale="ja"` and
 * the concept panel render at once, as an app that calls `preloadLocale` does
 * (REQ-356). Tests of the loading itself start from a fresh module graph
 * (`vi.resetModules()`).
 */
import { CONCEPT_CHUNKS, loadConceptChunk } from '../components/learning/conceptCatalog';
import { preloadLocale } from '../i18n/lazyLocales';

await preloadLocale('ja');
await Promise.all(
  (['en', 'ja'] as const).flatMap((locale) =>
    CONCEPT_CHUNKS.map((chunk) => loadConceptChunk(locale, chunk)),
  ),
);
