import { EXAM_LEVEL_1, type ExamLevel } from './examQuestions';

/**
 * Every level of the final test, easiest first. A level is added by writing
 * its file (`examLevelN.ts`, exporting an `ExamLevel`) and listing it here.
 */
export const EXAM_LEVELS: readonly ExamLevel[] = [EXAM_LEVEL_1];

export function examLevel(level: number): ExamLevel | undefined {
  return EXAM_LEVELS.find((entry) => entry.level === level);
}
