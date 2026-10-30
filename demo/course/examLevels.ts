import { EXAM_LEVEL_1, type ExamLevel } from './examQuestions';
import { EXAM_LEVEL_2 } from './examLevel2';
import { EXAM_LEVEL_3 } from './examLevel3';
import { EXAM_LEVEL_4 } from './examLevel4';
import { EXAM_STAGE_1 } from './examStage1';
import { EXAM_STAGE_2 } from './examStage2';
import { EXAM_STAGE_3 } from './examStage3';
import { EXAM_STAGE_7 } from './examStage7';

/**
 * Every level of the final test, numbered in the order they were written: 1–4
 * are the original levels, 5–8 the tests of learning-path stages 1, 2, 3 and 7.
 * A level is added by writing its file, exporting an `ExamLevel`, and listing
 * it here; the stage it belongs to is set in `stages.ts`.
 */
export const EXAM_LEVELS: readonly ExamLevel[] = [
  EXAM_LEVEL_1,
  EXAM_LEVEL_2,
  EXAM_LEVEL_3,
  EXAM_LEVEL_4,
  EXAM_STAGE_1,
  EXAM_STAGE_2,
  EXAM_STAGE_3,
  EXAM_STAGE_7,
];

export function examLevel(level: number): ExamLevel | undefined {
  return EXAM_LEVELS.find((entry) => entry.level === level);
}
