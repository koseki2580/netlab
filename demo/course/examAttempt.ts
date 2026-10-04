/**
 * One attempt at a level of the final test: the order its options are shown
 * in, what is kept so that leaving the page does not lose it, and the way back
 * from a lesson the test sent the learner to.
 *
 * Nothing here imports the questions, so the lesson shell can use the way back
 * without loading them.
 */
import type { ExamAnswer } from './examQuestions';

export type OptionIndex = 0 | 1 | 2 | 3;

export interface ExamAttempt {
  /** What the order of the options is derived from. */
  readonly seed: number;
  /** Whether "start" has been pressed, so the questions are shown. */
  readonly started: boolean;
  readonly answers: Readonly<Record<string, ExamAnswer>>;
  /** Whether the answers have been marked. The result is derived from them. */
  readonly marked: boolean;
}

export const NEW_ATTEMPT: ExamAttempt = { seed: 0, started: false, answers: {}, marked: false };

/** A small seeded generator (mulberry32): the same seed, the same numbers. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The order to show one question's four options in: original indices, in
 * displayed order. It depends only on the attempt's seed and the question's
 * place, so rendering never draws a random number.
 */
export function optionOrder(seed: number, questionIndex: number): readonly OptionIndex[] {
  const random = generator(
    Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(questionIndex + 1, 0x85ebca6b),
  );
  const order: OptionIndex[] = [0, 1, 2, 3];
  for (let last = order.length - 1; last > 0; last -= 1) {
    const pick = Math.floor(random() * (last + 1));
    [order[last], order[pick]] = [order[pick]!, order[last]!];
  }
  return order;
}

/** A seed named in an address as `examSeed=<whole number>`; the first one found. */
export function seedFromSearch(...searches: readonly string[]): number | undefined {
  for (const search of searches) {
    const raw = new URLSearchParams(search).get('examSeed');
    if (raw !== null && /^\d{1,9}$/.test(raw)) return Number(raw);
  }
  return undefined;
}

/**
 * The seed for the next attempt. A seed named in the address is used first and
 * then counted up, so a test can fix every order; otherwise one is drawn, and
 * never the one just used.
 */
export function nextSeed(
  named: number | undefined,
  previous: number | undefined,
  random: () => number,
): number {
  if (named !== undefined) return previous === undefined ? named : previous + 1;
  const drawn = Math.floor(random() * 0x7fffffff);
  return drawn === previous ? drawn + 1 : drawn;
}

type AttemptStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function attemptKey(level: number): string {
  return `netlab-exam-attempt:${level}`;
}

/** The tab's session store, or nothing where the browser refuses one. */
export function sessionStore(): AttemptStore | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function isAnswer(value: unknown): value is ExamAnswer {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 'not-learned';
}

function isAttempt(value: unknown): value is ExamAttempt {
  if (typeof value !== 'object' || value === null) return false;
  const { seed, started, answers, marked } = value as Record<string, unknown>;
  return (
    typeof seed === 'number' &&
    Number.isFinite(seed) &&
    typeof started === 'boolean' &&
    typeof marked === 'boolean' &&
    typeof answers === 'object' &&
    answers !== null &&
    !Array.isArray(answers) &&
    Object.values(answers).every(isAnswer)
  );
}

export function loadAttempt(store: AttemptStore | undefined, level: number): ExamAttempt | null {
  try {
    const raw = store?.getItem(attemptKey(level));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAttempt(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAttempt(
  store: AttemptStore | undefined,
  level: number,
  attempt: ExamAttempt,
): void {
  try {
    store?.setItem(attemptKey(level), JSON.stringify(attempt));
  } catch {
    /* the test still works; it just does not survive leaving the page */
  }
}

export function clearAttempt(store: AttemptStore | undefined, level: number): void {
  try {
    store?.removeItem(attemptKey(level));
  } catch {
    /* nothing was kept, so there is nothing to clear */
  }
}

/** The address of a level of the test. */
export function examRoute(level: number): string {
  return level === 1 ? '/course/exam' : `/course/exam/${level}`;
}

/** What the test adds to a lesson's address so the lesson can offer the way back. */
export function examReturnSearch(level: number): string {
  return `?fromExam=${level}`;
}

/** The level of the test a lesson was opened from, if its address names one. */
export function examLevelFromSearch(search: string): number | undefined {
  const raw = new URLSearchParams(search).get('fromExam');
  if (raw === null || !/^[1-9]\d?$/.test(raw)) return undefined;
  return Number(raw);
}
