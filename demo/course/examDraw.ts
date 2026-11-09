/**
 * Which ten questions an attempt asks (REQ-194). A level with a pool keeps
 * ten slots, one topic each; an attempt asks one question from every slot, so
 * every topic and every stop of the path is asked each time. The attempt's
 * seed picks within a slot, and a question asked in the attempt before is
 * passed over where the slot has another: the attempt after a failed one is a
 * new set, not the screen the learner just saw.
 */
import type { ExamLevel, ExamQuestion } from './examQuestions';

/** The same seeded generator as the option order (mulberry32). */
function generator(seed: number): () => number {
  let state = (Math.imul(seed + 7, 0x2c1b3c6d) ^ 0x5bd1e995) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ten questions for an attempt with this seed, knowing the ids the attempt before asked. */
export function drawQuestions(
  level: ExamLevel,
  seed: number,
  previous: readonly string[] = [],
): readonly ExamQuestion[] {
  if (!level.slots) return level.questions;
  const random = generator(seed);
  return level.slots.map((slot) => {
    const fresh = slot.filter((question) => !previous.includes(question.id));
    const from = fresh.length > 0 ? fresh : slot;
    return from[Math.floor(random() * from.length)]!;
  });
}

/**
 * The questions of a stored attempt, by the ids it drew. An attempt stored
 * before the pools has none: it is the level's original ten.
 */
export function questionsOf(
  level: ExamLevel,
  ids: readonly string[] | undefined,
): readonly ExamQuestion[] {
  if (!ids) return level.questions;
  const pool = level.slots?.flat() ?? level.questions;
  const found = ids.map((id) => pool.find((question) => question.id === id));
  return found.every((question) => question !== undefined)
    ? (found as ExamQuestion[])
    : level.questions;
}
