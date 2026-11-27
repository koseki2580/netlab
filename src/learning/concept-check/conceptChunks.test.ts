/**
 * The concept checks' strings are split into chunks, loaded one by one: a
 * `core` chunk (the panel's strings and every deck's name) and one chunk per
 * group of decks. These tests pin the split: nothing lost, nothing misplaced.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Catalog } from '../../i18n/types';
import { conceptCheck as enMerged } from '../../i18n/locales/en/conceptCheck';
import { conceptCheck as jaMerged } from '../../i18n/locales/ja/conceptCheck';
import { CONCEPT_DECKS } from './decks';
import type { ConceptDeck } from './types';

const LOCALES = ['en', 'ja'] as const;
const GROUPS = [
  'fundamentals',
  'l2',
  'l2infra',
  'l3',
  'l4',
  'l5',
  'l7web',
  'l7apps',
  'routing',
] as const;

const chunkFiles = import.meta.glob<{ catalog: Catalog }>(
  '../../i18n/locales/*/concept/concept-*.ts',
  { eager: true },
);
const deckFiles = import.meta.glob<Record<string, Catalog>>(
  '../../i18n/locales/*/concept/decks/*.ts',
  { eager: true },
);

function chunkOf(locale: string, chunk: string): Catalog {
  const module = chunkFiles[`../../i18n/locales/${locale}/concept/concept-${locale}-${chunk}.ts`];
  if (!module) throw new Error(`no ${locale} ${chunk} chunk`);
  return module.catalog;
}

/** Every key a deck's data refers to; its name first. */
function deckKeys(deck: ConceptDeck): string[] {
  return [
    deck.nameKey,
    ...deck.questions.flatMap((question) => [
      question.promptKey,
      question.explanationKey,
      ...question.options.flatMap((option) =>
        option.whyKey ? [option.key, option.whyKey] : [option.key],
      ),
    ]),
  ];
}

const PANEL_KEY =
  /^learning\.concept\.(title|primer|pickDeck|search|searchEmpty|streak|backToDecks|deckProgress|layer|review)(\.|$)/;
const DECK_KEY = /^learning\.concept\.[a-z][a-z0-9]*\.(name|q\d+\.(prompt|why|[abc](\.why)?))$/;

describe('concept-check string chunks', () => {
  it('TC-2270: the keys of the decks that existed before the split are exactly as they were, and lesson decks add only their own', () => {
    // Lesson decks (one file each in lessonDecks/) were added after the split; every other key is unchanged,
    // so saved review progress keeps working. sha256 of the sorted key list of the catalog the split replaced.
    const lessonIds = Object.keys(import.meta.glob('./lessonDecks/*.ts', { eager: true })).map(
      (path) => path.replace('./lessonDecks/', '').replace('.ts', ''),
    );
    const ofLessonDeck = (key: string) =>
      lessonIds.some((id) => key.startsWith(`learning.concept.${id}.`));
    for (const catalog of [enMerged, jaMerged]) {
      const keys = Object.keys(catalog).sort();
      const before = keys.filter((key) => !ofLessonDeck(key));
      expect(before).toHaveLength(1464);
      expect(before.filter((key) => key.endsWith('.prompt'))).toHaveLength(198);
      expect(createHash('sha256').update(before.join('\n')).digest('hex')).toBe(
        'ef8ebf1c8894a4ae0093f4c1401f1d3b68e550d9395bfea214ea4d153ea1efbf',
      );
      for (const id of lessonIds) {
        expect(
          keys.filter((key) => key.startsWith(`learning.concept.${id}.`)).length,
          id,
        ).toBeGreaterThan(10);
      }
    }
  });

  it('TC-2271: one core chunk and one chunk per deck group in each locale; a deck’s chunk is its layer, layer 7 split in two and layer 2’s infrastructure decks apart', () => {
    const expected = LOCALES.flatMap((locale) =>
      ['core', ...GROUPS].map(
        (chunk) => `../../i18n/locales/${locale}/concept/concept-${locale}-${chunk}.ts`,
      ),
    ).sort();
    expect(Object.keys(chunkFiles).sort()).toEqual(expected);
    expect(new Set(CONCEPT_DECKS.map((deck) => deck.chunk))).toEqual(new Set(GROUPS));
    for (const deck of CONCEPT_DECKS) {
      if (deck.layer === 'l7') expect(['l7web', 'l7apps']).toContain(deck.chunk);
      else if (deck.layer === 'l2') expect(['l2', 'l2infra']).toContain(deck.chunk);
      else expect(deck.chunk, deck.id).toBe(deck.layer);
    }
  });

  it('TC-2272: a deck’s name is in core, its other keys in its own chunk and deck file; no key is orphaned', () => {
    for (const locale of LOCALES) {
      const core = chunkOf(locale, 'core');
      const names = new Set(CONCEPT_DECKS.map((deck) => deck.nameKey));
      // Core holds every deck name and the panel's own strings, nothing else.
      for (const name of names) expect(core, `${locale} core lacks ${name}`).toHaveProperty([name]);
      for (const key of Object.keys(core)) {
        if (!names.has(key)) expect(key, `${locale} core`).toMatch(PANEL_KEY);
      }
      // A group chunk holds exactly its decks' questions.
      for (const chunk of GROUPS) {
        const want = CONCEPT_DECKS.filter((deck) => deck.chunk === chunk)
          .flatMap((deck) => deckKeys(deck).slice(1))
          .sort();
        expect(Object.keys(chunkOf(locale, chunk)).sort(), `${locale} ${chunk}`).toEqual(want);
      }
      // A deck file holds exactly its deck's questions, and exists only for a real deck.
      const files = Object.entries(deckFiles).filter(([path]) =>
        path.startsWith(`../../i18n/locales/${locale}/`),
      );
      const fileId = (path: string) => /decks\/(\w+)\.ts$/.exec(path)?.[1] ?? '';
      expect(files.map(([path]) => fileId(path)).sort()).toEqual(
        CONCEPT_DECKS.map((deck) => deck.id).sort(),
      );
      for (const [path, module] of files) {
        const deck = CONCEPT_DECKS.find((entry) => entry.id === fileId(path))!;
        expect(Object.keys(module[deck.id] ?? {}).sort(), path).toEqual(
          deckKeys(deck).slice(1).sort(),
        );
      }
    }
  });

  it('TC-2273: every deck key follows the one key pattern', () => {
    for (const locale of LOCALES) {
      for (const chunk of GROUPS) {
        for (const key of Object.keys(chunkOf(locale, chunk))) expect(key).toMatch(DECK_KEY);
      }
      for (const key of Object.keys(chunkOf(locale, 'core'))) {
        expect(DECK_KEY.test(key) || PANEL_KEY.test(key), key).toBe(true);
      }
    }
  });
});
