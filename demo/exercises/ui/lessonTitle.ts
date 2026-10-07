import { EXAM_LEVELS } from '../../course/examLevels';
import { DEMO_COPY_JA } from '../../galleryJa';
import type { Localised } from '../model/types';

/**
 * What a lesson is called, from its path. The final test already names its
 * lessons in both languages; the gallery's Japanese copy covers the rest.
 */
export function lessonTitle(path: string): Localised {
  for (const level of EXAM_LEVELS) {
    const stop = level.path.find((candidate) => candidate.path === path);
    if (stop) return stop.title;
  }
  return { en: `Lesson ${path}`, ja: DEMO_COPY_JA[path]?.title ?? 'レッスン' };
}
