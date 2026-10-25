/**
 * The checks every family of exercise templates passes, whatever it asks the
 * learner to do: device exercises (`demo/exercises/templates`) and packet
 * exercises (`demo/packet-lab/templates`).
 *
 * A family describes itself once (`TemplateFamily`); each `verify*` call
 * registers its tests. What only one family has — the grader's verdicts, the
 * wording rules of a kind of task — stays in that family's own verify file.
 *
 * Seeds: 0 to N-1, N = `EXERCISE_VERIFY_SEEDS` (default 12).
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ExerciseLevel, Localised } from '../model/types';

export const SEED_COUNT = Number(process.env.EXERCISE_VERIFY_SEEDS ?? 12);
export const SEEDS: readonly number[] = Array.from({ length: SEED_COUNT }, (_, seed) => seed);

/** What every generated exercise carries, whichever family it is from. */
export interface FamilyExercise {
  readonly id: string;
  readonly templateId: string;
  readonly seed: number;
  readonly level: ExerciseLevel;
  readonly kind: string;
  readonly generatorVersion: number;
  readonly fingerprint: string;
}

export interface FamilyTemplate<E extends FamilyExercise> {
  readonly id: string;
  readonly level: ExerciseLevel;
  readonly kind: string;
  readonly generatorVersion: number;
  readonly title: Localised;
  readonly generate: (seed: number) => E;
}

/** One list a learner picks from, and which entry of it is right. */
export interface Offer {
  /** Offers with the same key are measured together: `template:what is asked`. */
  readonly key: string;
  readonly candidates: readonly { readonly value: string | number; readonly right: boolean }[];
}

export interface TemplateFamily<E extends FamilyExercise> {
  /** For test names: "device", "packet". */
  readonly name: string;
  readonly templates: readonly FamilyTemplate<E>[];
  /** Seeds `0..poolSeeds-1` are the ones pools are drawn from. */
  readonly poolSeeds: number;
  readonly buildPool: (level: ExerciseLevel) => readonly string[];
  readonly exerciseById: (id: string) => E | undefined;
  /** The fewest ids a level with templates must offer. */
  readonly minPool: number;
  /** Seeds checked for determinism beyond 0..N-1 (far seeds a pool never reaches). */
  readonly extraSeeds?: readonly number[];
  /** The lists a learner picks from in one exercise, for the blind-pick check. */
  readonly offers: (exercise: E) => readonly Offer[];
  readonly golden: {
    readonly describe: string;
    readonly it: string;
    /** The instances recorded per template, and how many there must be. */
    readonly instances: (template: FamilyTemplate<E>) => readonly E[];
    readonly count: number;
    /** What is recorded of each: what the learner reads. */
    readonly view: (exercise: E) => unknown;
  };
}

const LEVELS: readonly ExerciseLevel[] = [1, 2, 3, 4];

// --- Lessons ------------------------------------------------------------------------

/**
 * The app's routes, as source text: `main.tsx`, and the lesson manifest the
 * routes are being moved into. A lesson an exercise links to must be one.
 */
const ROUTE_SOURCES = ['../../main.tsx', '../../lessonManifest.ts']
  .map((path) => new URL(path, import.meta.url))
  .filter((url) => existsSync(url))
  .map((url) => readFileSync(url, 'utf8'));

export function isLessonRoute(path: string): boolean {
  return ROUTE_SOURCES.some(
    (source) => source.includes(`path="${path}"`) || source.includes(`path: '${path}'`),
  );
}

// --- Determinism and identity ---------------------------------------------------------

// TC-470
export function verifyDeterminism<E extends FamilyExercise>(family: TemplateFamily<E>): void {
  const seeds = [...SEEDS, ...(family.extraSeeds ?? [])];
  describe(`${family.name} templates: the same seed gives the same exercise`, () => {
    it.each(family.templates.map((template) => [template.id, template] as const))(
      '%s',
      (_id, template) => {
        const problems: string[] = [];
        for (const seed of seeds) {
          const exercise = template.generate(seed);
          if (JSON.stringify(template.generate(seed)) !== JSON.stringify(exercise)) {
            problems.push(`${exercise.id}: generating twice gives two different exercises`);
          }
          if (
            exercise.id !== `${template.id}~${seed}` ||
            exercise.templateId !== template.id ||
            exercise.seed !== seed ||
            exercise.level !== template.level ||
            exercise.kind !== template.kind ||
            exercise.generatorVersion !== template.generatorVersion
          ) {
            problems.push(`${exercise.id}: id, seed, level or kind do not match the template`);
          }
        }
        expect(problems).toEqual([]);
      },
    );
  });
}

// --- Fingerprints and pools -------------------------------------------------------------

// TC-471, TC-472
export function verifyPools<E extends FamilyExercise>(family: TemplateFamily<E>): void {
  describe(`${family.name} templates: tasks and pools`, () => {
    it('every template has more than four different tasks (fingerprints) in its pool seeds', () => {
      const few: string[] = [];
      for (const template of family.templates) {
        const fingerprints = new Set(
          Array.from(
            { length: family.poolSeeds },
            (_, seed) => template.generate(seed).fingerprint,
          ),
        );
        if (fingerprints.size <= 4) few.push(`${template.id}: ${fingerprints.size}`);
      }
      expect(few).toEqual([]);
    });

    it.each(LEVELS)(
      `level %i: at least ${family.minPool} ids where the level has templates, unique, the same each time, all of that level`,
      (level) => {
        const pool = family.buildPool(level);
        if (!family.templates.some((template) => template.level === level)) {
          expect(pool).toEqual([]);
          return;
        }
        expect(pool.length).toBeGreaterThanOrEqual(family.minPool);
        expect(new Set(pool).size).toBe(pool.length);
        expect(family.buildPool(level)).toEqual(pool);
        for (const id of pool) expect(family.exerciseById(id)?.level, id).toBe(level);
      },
    );
  });
}

// --- Learners who pick without reading -----------------------------------------------------

/** More seeds than a pool holds: a rate over 100 instances moves a few points by chance alone. */
const BLIND_SEEDS = 400;

type Strategy = 'random' | 'first' | 'last' | 'lowest' | 'highest' | 'most-common';
const STRATEGIES: readonly Strategy[] = [
  'random',
  'first',
  'last',
  'lowest',
  'highest',
  'most-common',
];

type Candidate = Offer['candidates'][number];

const compare = (a: string | number, b: string | number) =>
  typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));

/** The candidate that shares its first three numbers (an address) or its first half (anything else) with the most others. */
function mostCommon(candidates: readonly Candidate[]): Candidate | undefined {
  const head = (value: string | number) => {
    const text = String(value);
    return text.includes('.')
      ? text.split('.').slice(0, 3).join('.')
      : text.slice(0, Math.ceil(text.length / 2));
  };
  let best: Candidate | undefined;
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = candidates.filter((other) => head(other.value) === head(candidate.value)).length;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function choose(
  strategy: Strategy,
  candidates: readonly Candidate[],
  roll: number,
): Candidate | undefined {
  const sorted = [...candidates].sort((a, b) => compare(a.value, b.value));
  switch (strategy) {
    case 'random':
      return candidates[Math.floor(roll * candidates.length)];
    case 'first':
      return candidates[0];
    case 'last':
      return candidates[candidates.length - 1];
    case 'lowest':
      return sorted[0];
    case 'highest':
      return sorted[sorted.length - 1];
    case 'most-common':
      return mostCommon(candidates);
  }
}

/**
 * Over 400 seeds of every template, no blind strategy and no fixed value picks
 * the right entry of a list more than 10 points above chance.
 */
export function verifyBlindPicks<E extends FamilyExercise>(family: TemplateFamily<E>): void {
  describe(`${family.name} exercises: learners who pick without reading`, () => {
    const offers = new Map<string, Offer[]>();
    for (const template of family.templates) {
      for (let seed = 0; seed < BLIND_SEEDS; seed += 1) {
        for (const offer of family.offers(template.generate(seed))) {
          offers.set(offer.key, [...(offers.get(offer.key) ?? []), offer]);
        }
      }
    }

    it('some exercises offer lists to pick from', () => {
      expect(offers.size).toBeGreaterThan(0);
    });

    it.each([...offers.keys()])(
      '%s: no blind strategy, and no fixed value, beats chance by more than 10 points',
      (key) => {
        const list = offers.get(key) ?? [];
        // Where more than one entry works, a blind pick is right that much more often.
        const share = (offer: Offer) =>
          offer.candidates.filter((candidate) => candidate.right).length / offer.candidates.length;
        const chance = list.reduce((sum, offer) => sum + share(offer), 0) / list.length;
        let state = 12345;
        const roll = () => {
          state = (Math.imul(state, 1103515245) + 12345) >>> 0;
          return state / 2 ** 32;
        };
        const rates = STRATEGIES.map((strategy) => {
          const hits = list.filter(
            (offer) => choose(strategy, offer.candidates, roll())?.right === true,
          ).length;
          return [strategy, hits / list.length] as const;
        });
        // "Always this value", for every value offered: what a learner gets by
        // remembering an answer across instances. Measured where the value is
        // offered at least 30 times (fewer is noise: one value right 7 times in
        // 12 happens by chance), against the chance of those offers. A value
        // offered more rarely is not one a learner can come to remember.
        const byValue = new Map<string, { offered: number; right: number; chance: number }>();
        for (const offer of list) {
          for (const candidate of offer.candidates) {
            const entry = byValue.get(String(candidate.value)) ?? {
              offered: 0,
              right: 0,
              chance: 0,
            };
            entry.offered += 1;
            entry.right += candidate.right ? 1 : 0;
            entry.chance += share(offer);
            byValue.set(String(candidate.value), entry);
          }
        }
        const fixed = [...byValue.entries()]
          .filter(([, entry]) => entry.offered >= 30)
          .map(([value, entry]) => ({
            value,
            rate: entry.right / entry.offered,
            chance: entry.chance / entry.offered,
            offered: entry.offered,
          }))
          .sort((a, b) => b.rate - b.chance - (a.rate - a.chance));
        const worst = fixed[0];
        console.log(
          `${key}: chance ${(chance * 100).toFixed(0)}%, ` +
            rates.map(([strategy, rate]) => `${strategy} ${(rate * 100).toFixed(0)}%`).join(', ') +
            (worst
              ? `, always "${worst.value.length > 12 ? 'that value' : worst.value}" ${(worst.rate * 100).toFixed(0)}% of ${worst.offered}`
              : ''),
        );
        for (const entry of fixed) {
          expect(entry.rate, `always "${entry.value}"`).toBeLessThanOrEqual(entry.chance + 0.1);
        }
        for (const [strategy, rate] of rates) {
          expect(rate, strategy).toBeLessThanOrEqual(chance + 0.1);
        }
      },
    );
  });
}

// --- Golden snapshots --------------------------------------------------------------------

/**
 * What learners read, recorded per template. A change here is a change to what
 * learners get: read the diff (a native read of the Japanese is part of
 * review), then bump the family's generator version.
 */
export function verifyGolden<E extends FamilyExercise>(family: TemplateFamily<E>): void {
  describe(family.golden.describe, () => {
    it.each(family.templates.map((template) => [template.id, template] as const))(
      family.golden.it,
      (_id, template) => {
        const instances = family.golden.instances(template).map(family.golden.view);
        expect(instances).toHaveLength(family.golden.count);
        expect(instances).toMatchSnapshot();
      },
    );
  });
}

/** Every check this module holds, golden snapshots aside (they live in their own file). */
export function verifyFamily<E extends FamilyExercise>(family: TemplateFamily<E>): void {
  verifyDeterminism(family);
  verifyPools(family);
  verifyBlindPicks(family);
}
