import { logger } from '../../utils/logger';
import type { Catalog } from '../../i18n/types';
import type { ConceptChunk } from '../../learning/concept-check';

/**
 * The concept checks' strings, in English and Japanese, split into chunks
 * that load on demand: `core` (the panel's strings and every deck's name) and
 * one chunk per group of decks (REQ-365, as REQ-356 does for the app's
 * catalogue). Each specifier is static so Vite splits every chunk on its own.
 */
type ConceptLocale = 'en' | 'ja';
type Loader = () => Promise<{ catalog: Catalog }>;

const LOADERS: Readonly<Record<ConceptLocale, Readonly<Record<ConceptChunk, Loader>>>> = {
  en: {
    core: () => import('../../i18n/locales/en/concept/concept-en-core'),
    fundamentals: () => import('../../i18n/locales/en/concept/concept-en-fundamentals'),
    l2: () => import('../../i18n/locales/en/concept/concept-en-l2'),
    l2infra: () => import('../../i18n/locales/en/concept/concept-en-l2infra'),
    l3: () => import('../../i18n/locales/en/concept/concept-en-l3'),
    l4: () => import('../../i18n/locales/en/concept/concept-en-l4'),
    l5: () => import('../../i18n/locales/en/concept/concept-en-l5'),
    l7web: () => import('../../i18n/locales/en/concept/concept-en-l7web'),
    l7apps: () => import('../../i18n/locales/en/concept/concept-en-l7apps'),
    routing: () => import('../../i18n/locales/en/concept/concept-en-routing'),
  },
  ja: {
    core: () => import('../../i18n/locales/ja/concept/concept-ja-core'),
    fundamentals: () => import('../../i18n/locales/ja/concept/concept-ja-fundamentals'),
    l2: () => import('../../i18n/locales/ja/concept/concept-ja-l2'),
    l2infra: () => import('../../i18n/locales/ja/concept/concept-ja-l2infra'),
    l3: () => import('../../i18n/locales/ja/concept/concept-ja-l3'),
    l4: () => import('../../i18n/locales/ja/concept/concept-ja-l4'),
    l5: () => import('../../i18n/locales/ja/concept/concept-ja-l5'),
    l7web: () => import('../../i18n/locales/ja/concept/concept-ja-l7web'),
    l7apps: () => import('../../i18n/locales/ja/concept/concept-ja-l7apps'),
    routing: () => import('../../i18n/locales/ja/concept/concept-ja-routing'),
  },
};

/** Every chunk, core first. */
export const CONCEPT_CHUNKS = Object.keys(LOADERS.en) as readonly ConceptChunk[];

/** The locale whose concept strings a page shows: Japanese, or else English. */
export const conceptLocale = (locale: string): ConceptLocale => (locale === 'ja' ? 'ja' : 'en');

const loaded = new Map<string, Catalog>();
const loading = new Map<string, Promise<Catalog>>();

/** A chunk's strings once loaded (its fallback, if it failed); `undefined` until then. */
export function conceptChunk(locale: string, chunk: ConceptChunk): Catalog | undefined {
  return loaded.get(`${conceptLocale(locale)}:${chunk}`);
}

/**
 * Load one chunk and keep it. A chunk that fails to load logs one warning and
 * is replaced by its English chunk (an English one, by an empty catalog), so
 * the panel shows English for that group and every other chunk is untouched.
 */
export function loadConceptChunk(locale: string, chunk: ConceptChunk): Promise<Catalog> {
  const lang = conceptLocale(locale);
  const id = `${lang}:${chunk}`;
  let pending = loading.get(id);
  if (!pending) {
    pending = LOADERS[lang][chunk]()
      .then(
        (module) => module.catalog,
        (error: unknown): Catalog | Promise<Catalog> => {
          logger.warn(
            `could not load the ${lang} concept checks (${chunk}); showing English`,
            error,
          );
          return lang === 'en' ? {} : loadConceptChunk('en', chunk);
        },
      )
      .then((catalog) => {
        loaded.set(id, catalog);
        return catalog;
      });
    loading.set(id, pending);
  }
  return pending;
}
