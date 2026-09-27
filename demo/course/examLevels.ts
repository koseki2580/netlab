import { EXAM_LEVEL_1, type ExamLevel } from './examQuestions';
import { EXAM_LEVEL_2 } from './examLevel2';
import { EXAM_LEVEL_3 } from './examLevel3';
import { EXAM_LEVEL_4 } from './examLevel4';

/**
 * Every level of the final test, easiest first. A level is added by writing
 * its file (`examLevelN.ts`, exporting an `ExamLevel`) and listing it here.
 */
export const EXAM_LEVELS: readonly ExamLevel[] = [
  EXAM_LEVEL_1,
  EXAM_LEVEL_2,
  EXAM_LEVEL_3,
  EXAM_LEVEL_4,
];

export function examLevel(level: number): ExamLevel | undefined {
  return EXAM_LEVELS.find((entry) => entry.level === level);
}
