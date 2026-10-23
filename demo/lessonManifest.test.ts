import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EXAM_LEVELS } from './course/examLevels';
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
