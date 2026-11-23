import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getDeck } from '../src/learning/concept-check';
import { EXAM_LEVELS } from './course/examLevels';
import { STAGES } from './course/stages';
import { CATEGORIES } from './Gallery';
import { DEMO_COPY_JA } from './galleryJa';
import {
  COURSE_PATH,
  LESSON_CATEGORIES,
  LESSONS,
  SCENARIO_ROUTES,
  type Lesson,
} from './lessonManifest';

// TC-730: one manifest names every lesson, and everything that links to a
// lesson resolves through it.
describe('the lesson manifest (TC-730)', () => {
  const paths = LESSONS.map((lesson) => lesson.path);

  it('names each lesson once', () => {
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('gives every lesson an English and a Japanese title and description', () => {
    for (const lesson of LESSONS) {
      expect(lesson.title.en.trim(), lesson.path).not.toBe('');
      expect(lesson.title.ja.trim(), lesson.path).not.toBe('');
      expect(lesson.desc.en.trim(), lesson.path).not.toBe('');
      expect(lesson.desc.ja.trim(), lesson.path).not.toBe('');
      expect(DEMO_COPY_JA[lesson.path]?.title, lesson.path).toBe(lesson.title.ja);
    }
  });

  it('puts every lesson in a gallery category, and every card is a lesson', () => {
    const categories = new Set(LESSON_CATEGORIES.map((category) => category.id));
    for (const lesson of LESSONS) expect(categories.has(lesson.category), lesson.path).toBe(true);
    const cards = CATEGORIES.flatMap((category) => category.demos.map((demo) => demo.path));
    expect(cards).toEqual(paths);
  });

  it('sends every stop of every exam level to a lesson or to the course', () => {
    const known = new Set<string>([...paths, COURSE_PATH]);
    for (const level of EXAM_LEVELS) {
      for (const stop of level.path) expect(known.has(stop.path), stop.path).toBe(true);
    }
  });

  it('maps every scenario a lesson runs to that lesson', () => {
    for (const [scenario, path] of Object.entries(SCENARIO_ROUTES)) {
      const lesson = (LESSONS as readonly Lesson[]).find((entry) => entry.path === path);
      expect(lesson?.scenarioId, scenario).toBe(scenario);
    }
  });

  it('names a page module that exists for every lesson', () => {
    for (const lesson of LESSONS) {
      const file = fileURLToPath(new URL(`${lesson.module}.tsx`, import.meta.url));
      expect(existsSync(file), lesson.path).toBe(true);
      // The app finds pages by this name pattern (`main.tsx`).
      expect(lesson.module, lesson.path).toMatch(/^\.\/[^/]+\/[^/]+Demo$/);
    }
  });
});

/**
 * Lessons on the learning path that are drills or tools rather than a topic,
 * and so carry no concept-check deck of their own.
 */
const NO_DECK_ON_PATH: readonly string[] = [
  '/learning/bits', // a binary drill
  '/learning/subnetting', // a subnetting drill
  '/learning/vlsm', // a VLSM drill
  '/learning/protocols', // the concept checks themselves
  '/simulation/failure', // a failure-injection tool
  '/learning/resilience', // a failure-prediction lab
  '/networking/observability', // NetFlow / sFlow: no deck covers flow export
];

describe('the concept check each lesson ends with', () => {
  const byPath = new Map((LESSONS as readonly Lesson[]).map((lesson) => [lesson.path, lesson]));
  const onPath = STAGES.flatMap((stage) => stage.lessons);

  it('TC-2290: every lesson on the path has a deck, or is a drill or tool named as having none', () => {
    const missing = onPath.filter(
      (path) => !byPath.get(path)?.conceptDeck && !NO_DECK_ON_PATH.includes(path),
    );
    expect(missing).toEqual([]);
    // The list stays honest: nothing on it has a deck, and everything on it is on the path.
    for (const path of NO_DECK_ON_PATH) {
      expect(byPath.get(path)?.conceptDeck, path).toBeUndefined();
      expect(onPath, path).toContain(path);
    }
  });

  // Fails until every new deck named in the manifest has been added to CONCEPT_DECKS.
  it('TC-2291: every deck a lesson names exists', () => {
    const unknown = (LESSONS as readonly Lesson[]).flatMap((lesson) =>
      lesson.conceptDeck && !getDeck(lesson.conceptDeck)
        ? [`${lesson.path} → ${lesson.conceptDeck}`]
        : [],
    );
    expect(unknown).toEqual([]);
  });
});
