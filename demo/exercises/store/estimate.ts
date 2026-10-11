/**
 * From the list of attempts to "which level can this learner solve": a rule
 * simple enough to say back to the learner in one sentence.
 */

import type { ExerciseKind, ExerciseLevel } from '../model/types';
import type { AttemptLocale, AttemptRecord, PlacementResult } from './types';

/**
 * The rule, as the learner is told it: a level is cleared when, of the last 10
 * exercises you pressed Check on, you solved 7 from at least 3 templates, at
 * least one of every kind of task the level has, each without a hint and on
 * the first Check (within two Checks where the answer is typed).
 */

/** A level is judged on the last this-many distinct exercises. */
export const WINDOW_SIZE = 10;
/** Below this many distinct exercises there is no verdict yet. */
export const MIN_ATTEMPTED = 5;
/** Solved without help, out of the window, to clear a level. */
export const CLEAR_MIN_SOLVED = 7;
/** The solved exercises must come from at least this many templates. */
export const CLEAR_MIN_TEMPLATES = 3;

/**
 * A solve counts toward a level only up to this many Checks where the answer
 * is typed or built. Where it is one of a few things to press, it counts on
 * the first Check only (`AttemptRecord.checksToCount`, `model/closedSet.ts`):
 * trying the candidates in turn is not the same as knowing the answer.
 */
export const MAX_CHECKS_TO_COUNT = 2;

/**
 * The kinds of task a level has. Each needs one clean solve in the window: a
 * learner who can set an address but cannot find a fault has not cleared the
 * level, however many of the first kind they solve. (`levelRule.test.ts`
 * checks this against the templates. Levels 3 and 4 have no templates yet.)
 */
export const REQUIRED_KINDS: Readonly<Record<ExerciseLevel, readonly ExerciseKind[]>> = {
  1: ['configure', 'diagnose-repair', 'choose-design'],
  2: ['switch', 'configure', 'diagnose-repair', 'choose-design'],
  3: [],
  4: [],
};

/** A kind of task as the learner is told it: "a 'find the fault' exercise". */
export const KIND_WORDS: Readonly<Record<ExerciseKind, { en: string; ja: string }>> = {
  configure: { en: 'set it up', ja: '設定を入れる' },
  switch: { en: 'set up a switch', ja: 'スイッチを設定する' },
  'choose-design': { en: 'choose one', ja: 'どれにするか選ぶ' },
  'diagnose-repair': { en: 'find the fault', ja: 'おかしい所をさがす' },
};

/** How many Checks a solve of this attempt may take and still count. */
export function checksCounted(attempt: AttemptRecord): number {
  return attempt.checksToCount ?? MAX_CHECKS_TO_COUNT;
}

export const EXERCISE_LEVELS: readonly ExerciseLevel[] = [1, 2, 3, 4];

export type LevelStatus = 'not-enough' | 'in-progress' | 'cleared';

export interface LevelSummary {
  readonly level: ExerciseLevel;
  /** Distinct attempted exercises in the window (at most `WINDOW_SIZE`). */
  readonly counted: number;
  /** Passed with no hint, no reveal, and within the Checks that count for the exercise. */
  readonly solved: number;
  /** Passed after opening a hint. */
  readonly solvedWithHelp: number;
  /** Passed with no hint, but only after more Checks than count for the exercise. */
  readonly solvedAfterTries: number;
  /** Everything else: left unsolved, given up, or passed only after the answer was shown. */
  readonly notSolved: number;
  /** Distinct templates among the solved. */
  readonly solvedTemplates: number;
  /** The kinds of task the level requires that have no clean solve in the window. */
  readonly missingKinds: readonly ExerciseKind[];
  readonly status: LevelStatus;
  /** The template with the most unsolved exercises in the window; `null` when none is unsolved. */
  readonly weakestTemplateId: string | null;
}

/**
 * Whether the learner did anything to be judged on: pressed Check, or asked
 * for the answer. An exercise opened and left stays in the record, and is not
 * an attempt.
 */
export function isAttempted(attempt: AttemptRecord): boolean {
  return attempt.checkPresses > 0 || attempt.revealed || attempt.outcome !== 'abandoned';
}

function isPassedUnaided(attempt: AttemptRecord): boolean {
  return attempt.outcome === 'passed' && attempt.hintsUsed === 0 && !attempt.revealed;
}

export function isSolved(attempt: AttemptRecord): boolean {
  return isPassedUnaided(attempt) && attempt.checkPresses <= checksCounted(attempt);
}

/** Passed with no hint, but by more Checks than count. */
export function isSolvedAfterTries(attempt: AttemptRecord): boolean {
  return isPassedUnaided(attempt) && attempt.checkPresses > checksCounted(attempt);
}

function isSolvedWithHelp(attempt: AttemptRecord): boolean {
  return attempt.outcome === 'passed' && attempt.hintsUsed > 0 && !attempt.revealed;
}

/**
 * The attempts a level is judged on: the latest attempt at each of the last
 * `WINDOW_SIZE` distinct exercises, newest first. `pre` attempts never count,
 * and neither does an exercise that was only opened.
 */
function windowFor(attempts: readonly AttemptRecord[], level: ExerciseLevel): AttemptRecord[] {
  const newestFirst = attempts
    .map((attempt, index) => ({ attempt, index }))
    .filter(
      ({ attempt }) => attempt.level === level && attempt.context !== 'pre' && isAttempted(attempt),
    )
    .sort((a, b) => b.attempt.startedAt - a.attempt.startedAt || b.index - a.index);

  const seen = new Set<string>();
  const window: AttemptRecord[] = [];
  for (const { attempt } of newestFirst) {
    if (seen.has(attempt.exerciseId)) continue;
    seen.add(attempt.exerciseId);
    window.push(attempt);
    if (window.length === WINDOW_SIZE) break;
  }
  return window;
}

export function levelSummary(
  attempts: readonly AttemptRecord[],
  level: ExerciseLevel,
): LevelSummary {
  const window = windowFor(attempts, level);
  const solved = window.filter(isSolved);
  const solvedWithHelp = window.filter(isSolvedWithHelp).length;
  const solvedAfterTries = window.filter(isSolvedAfterTries).length;
  const solvedTemplates = new Set(solved.map((attempt) => attempt.templateId)).size;

  // `window` is newest first, so the first template to reach the highest count
  // of unsolved exercises is also the one that failed most recently.
  const failures = new Map<string, number>();
  for (const attempt of window) {
    if (attempt.outcome === 'passed' && !attempt.revealed) continue;
    failures.set(attempt.templateId, (failures.get(attempt.templateId) ?? 0) + 1);
  }
  let weakestTemplateId: string | null = null;
  let most = 0;
  for (const [templateId, count] of failures) {
    if (count > most) {
      most = count;
      weakestTemplateId = templateId;
    }
  }

  const solvedKinds = new Set(solved.map((attempt) => attempt.kind));
  const missingKinds = REQUIRED_KINDS[level].filter((kind) => !solvedKinds.has(kind));

  let status: LevelStatus = 'in-progress';
  if (window.length < MIN_ATTEMPTED) status = 'not-enough';
  else if (
    solved.length >= CLEAR_MIN_SOLVED &&
    solvedTemplates >= CLEAR_MIN_TEMPLATES &&
    missingKinds.length === 0
  ) {
    status = 'cleared';
  }

  return {
    level,
    counted: window.length,
    solved: solved.length,
    solvedWithHelp,
    solvedAfterTries,
    notSolved: window.length - solved.length - solvedWithHelp - solvedAfterTries,
    solvedTemplates,
    missingKinds,
    status,
    weakestTemplateId,
  };
}

/**
 * The highest cleared level whose lower levels are all cleared too, or were
 * covered by placement (every level up to the placement result). 0 when none.
 */
export function estimatedLevel(
  attempts: readonly AttemptRecord[],
  placement?: PlacementResult,
): 0 | ExerciseLevel {
  const placed = placement?.level ?? 0;
  let estimate: 0 | ExerciseLevel = 0;
  for (const level of EXERCISE_LEVELS) {
    const cleared = levelSummary(attempts, level).status === 'cleared';
    if (cleared) estimate = level;
    else if (level > placed) break;
  }
  return estimate;
}

/**
 * The one short line a level leads with: what is still needed, in a number.
 * `explain` follows it with the whole rule.
 */
export function headline(summary: LevelSummary, locale: AttemptLocale): string {
  const { level, counted, solved, solvedTemplates, status } = summary;
  const ja = locale === 'ja';

  if (status === 'not-enough') {
    const more = MIN_ATTEMPTED - counted;
    return ja
      ? `あと ${more} 問やると、判定できます`
      : `Do ${more} more and this level can be judged`;
  }
  if (status === 'cleared') return ja ? `レベル ${level} 達成です` : `Level ${level} cleared`;

  const more = CLEAR_MIN_SOLVED - solved;
  if (more > 0) {
    return ja
      ? `あと ${more} 問 とけたら、レベル ${level} 達成です（いま ${solved} 問）`
      : `Solve ${more} more to clear level ${level} (${solved} so far)`;
  }
  // Enough solved, from too few templates.
  const kinds = CLEAR_MIN_TEMPLATES - solvedTemplates;
  if (kinds > 0) {
    return ja
      ? `ちがう種類の問題が あと ${kinds} 種類 とけたら、レベル ${level} 達成です（いま ${solvedTemplates} 種類）`
      : `Solve ${kinds} more ${kinds === 1 ? 'kind' : 'kinds'} of exercise to clear level ${level} (${solvedTemplates} ${solvedTemplates === 1 ? 'kind' : 'kinds'} so far)`;
  }
  // Enough solved, but a kind of task the level has is not among them.
  return ja
    ? `${missingKindsText(summary, true)}問題が 1 問 とけたら、レベル ${level} 達成です`
    : `Solve one ${missingKindsText(summary, false)} exercise to clear level ${level}`;
}

/** 「「おかしい所をさがす」」 / '"find the fault"': the first kind still missing. */
function missingKindsText(summary: LevelSummary, ja: boolean): string {
  const [kind] = summary.missingKinds;
  if (kind === undefined) return '';
  return ja ? `「${KIND_WORDS[kind].ja}」` : `"${KIND_WORDS[kind].en}"`;
}

/** How a solve is counted, as the learner is told it everywhere. */
export const COUNTED_HOW = {
  en: 'without a hint, on the first Check (within 2 Checks where you type the answer),',
  ja: 'ヒントなしで、1 回目の「たしかめる」（自分で入力する問題は 2 回目まで）で',
} as const;

/** What was passed but is not counted, as one sentence; empty when there is nothing to say. */
function notCounted(summary: LevelSummary, ja: boolean): string {
  const { solvedWithHelp: hint, solvedAfterTries: tries } = summary;
  if (hint === 0 && tries === 0) return '';
  if (ja) {
    const parts = [
      ...(hint > 0 ? [`ヒントを使って解けた ${hint} 問`] : []),
      ...(tries > 0 ? [`何度かためして解けた ${tries} 問`] : []),
    ];
    return `${parts.join('と、')}は数えていません。`;
  }
  const parts = [
    ...(hint > 0 ? [`the ${hint} you solved with a hint`] : []),
    ...(tries > 0 ? [`the ${tries} you solved after several tries`] : []),
  ];
  const text = parts.join(' and ');
  return ` ${text.charAt(0).toUpperCase()}${text.slice(1)} ${hint + tries === 1 ? 'is' : 'are'} not counted.`;
}

/** The sentence shown to the learner under a level: where they stand and what is still needed. */
export function explain(summary: LevelSummary, locale: AttemptLocale): string {
  const { level, counted, solved, solvedTemplates, status } = summary;
  const ja = locale === 'ja';

  if (status === 'not-enough') {
    const more = MIN_ATTEMPTED - counted;
    return ja
      ? `レベル ${level} で「たしかめる」まで進んだのは、まだ ${counted} 問です。あと ${more} 問取り組むと、判定できます。`
      : `You have pressed Check on ${counted} ${counted === 1 ? 'exercise' : 'exercises'} at level ${level} so far. Try ${more} more and this level can be judged.`;
  }

  if (status === 'cleared') {
    return ja
      ? `直近 ${counted} 問のうち ${solved} 問を、${COUNTED_HOW.ja}解けました（${solvedTemplates} 種類）。レベル ${level} は達成です。`
      : `You solved ${solved} of your last ${counted} exercises ${COUNTED_HOW.en} across ${solvedTemplates} kinds of exercise. Level ${level} is cleared.`;
  }

  const required = REQUIRED_KINDS[level];
  const missing = missingKindsText(summary, ja);
  if (ja) {
    const every =
      required.length > 0
        ? `、${required.map((kind) => `「${KIND_WORDS[kind].ja}」`).join('')}の問題をそれぞれ 1 問以上`
        : '';
    const still = missing === '' ? '' : `${missing}問題は、まだ 1 問も数えられていません。`;
    return `直近 ${counted} 問のうち、${COUNTED_HOW.ja}解けたのは ${solved} 問（${solvedTemplates} 種類）です。${notCounted(summary, true)}${still}レベル ${level} は、直近 ${WINDOW_SIZE} 問のうち ${CLEAR_MIN_SOLVED} 問を、${CLEAR_MIN_TEMPLATES} 種類以上にわたって${every}、そのように解けると達成です。`;
  }
  const every =
    required.length > 0
      ? `, with at least one of each task (${required.map((kind) => `"${KIND_WORDS[kind].en}"`).join(', ')})`
      : '';
  const still = missing === '' ? '' : ` No ${missing} exercise is counted yet.`;
  return `You solved ${solved} of your last ${counted} exercises ${COUNTED_HOW.en} across ${solvedTemplates} ${solvedTemplates === 1 ? 'kind' : 'kinds'} of exercise.${notCounted(summary, false)}${still} Level ${level} is cleared at ${CLEAR_MIN_SOLVED} of the last ${WINDOW_SIZE} solved that way, across at least ${CLEAR_MIN_TEMPLATES} kinds${every}.`;
}
