/**
 * From the list of attempts to "which level can this learner solve": a rule
 * simple enough to say back to the learner in one sentence.
 */

import type { ExerciseLevel, Localised } from '../model/types';
import type { AttemptLocale, AttemptRecord, PlacementResult } from './types';

/**
 * The rule, as the learner is told it: a level is cleared when, of the last 10
 * exercises you pressed Check on, you solved 7, and of every kind of task the
 * level has, the latest one you did is solved; each without a hint and on the
 * first Check (within two Checks where the answer is typed). An exercise
 * counts once, as it went the first time: doing it again does not change it.
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
 * The kinds of task a level has: its templates, by id, in the order the level
 * introduces them. (`levelRule.test.ts` checks this against the templates.
 * Levels 3 and 4 have none yet.)
 *
 * Of each kind, the latest exercise the learner was judged on must be a clean
 * solve. Seven of ten alone let a learner clear a level who solved five kinds
 * every time and two never (the "/number" and the two sides of a router, by
 * the one rule they knew): the level is "every kind of task here", so a kind
 * that still goes wrong keeps it open, and so does a kind never tried. A miss
 * is made good the next time that kind comes up.
 */
export const LEVEL_KINDS: Readonly<Record<ExerciseLevel, readonly string[]>> = {
  1: [
    'l1-host-address',
    'l1-host-blank',
    'l1-cable-off',
    'l1-router-address',
    'l1-prefix-fit',
    'l1-choose-address',
    'l1-which-pc',
  ],
  2: [
    'l2-vlan-access',
    'l2-vlan-separate',
    'l2-trunk-allowed',
    'l2-stp-root',
    'l2-static-missing',
    'l2-static-return',
    'l2-static-nexthop',
    'l2-acl-permit',
    'l2-choose-root',
    'l2-choose-static-default',
  ],
  3: [],
  4: [],
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
  /**
   * The kinds of task of the level (template ids, `LEVEL_KINDS`) whose latest
   * judged exercise is not a clean solve, or that were never tried.
   */
  readonly missingKinds: readonly string[];
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
 * The attempts a level is judged on: of the last `WINDOW_SIZE` exercises the
 * learner was judged on, the FIRST judged attempt at each, newest first.
 *
 * The first, not the latest: an exercise opened again after a miss, or after
 * its answer was shown, has the same answer, and pressing it proves nothing.
 * So an exercise is judged once, where it stood when it was first judged; a
 * later visit neither changes the verdict nor moves the exercise in the window.
 * An exercise that was only opened is judged on the visit that pressed Check.
 * `pre` attempts never count, and neither does an exercise first met there.
 */
function judgedFor(attempts: readonly AttemptRecord[], level: ExerciseLevel): AttemptRecord[] {
  const oldestFirst = attempts
    .map((attempt, index) => ({ attempt, index }))
    .filter(({ attempt }) => attempt.level === level && isAttempted(attempt))
    .sort((a, b) => a.attempt.startedAt - b.attempt.startedAt || a.index - b.index);

  const first = new Map<string, AttemptRecord>();
  for (const { attempt } of oldestFirst) {
    if (!first.has(attempt.exerciseId)) first.set(attempt.exerciseId, attempt);
  }
  // Every exercise the learner was judged on, by its first judged attempt, newest first.
  return [...first.values()].filter((attempt) => attempt.context !== 'pre').reverse();
}

export function levelSummary(
  attempts: readonly AttemptRecord[],
  level: ExerciseLevel,
): LevelSummary {
  const judged = judgedFor(attempts, level);
  const window = judged.slice(0, WINDOW_SIZE);
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

  // Of each kind of task, the latest exercise judged (in the window or before it).
  const latest = new Map<string, AttemptRecord>();
  for (const attempt of judged) {
    if (!latest.has(attempt.templateId)) latest.set(attempt.templateId, attempt);
  }
  const missingKinds = LEVEL_KINDS[level].filter((kind) => {
    const attempt = latest.get(kind);
    return attempt === undefined || !isSolved(attempt);
  });

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
  // Enough solved, but of some kind of task the latest one is not: `stillMissing` names them.
  return ja
    ? `あとは、まだ解けていない種類が解ければ、レベル ${level} 達成です（いま ${solved} 問）`
    : `Solve the kinds of task still open to clear level ${level} (${solved} solved so far)`;
}

/** How many kinds of task `stillMissing` names before it says "and N more". */
const MISSING_NAMED = 2;

/**
 * The second short line of a level: which kinds of task are still open, by
 * name (`titleOf`: the title of a template, as the level page lists it).
 * Null when there is nothing to name: no verdict yet, cleared, or none open.
 */
export function stillMissing(
  summary: LevelSummary,
  locale: AttemptLocale,
  titleOf: (templateId: string) => Localised | undefined,
): string | null {
  if (summary.status !== 'in-progress' || summary.missingKinds.length === 0) return null;
  const names = summary.missingKinds
    .slice(0, MISSING_NAMED)
    .map((kind) => titleOf(kind)?.[locale] ?? kind);
  const more = summary.missingKinds.length - names.length;
  return locale === 'ja'
    ? `まだ解けていない種類：${names.map((name) => `「${name}」`).join('')}${more > 0 ? ` ほか ${more} 種類` : ''}`
    : `Kinds of task not solved yet: ${names.map((name) => `"${name}"`).join(', ')}${more > 0 ? ` and ${more} more` : ''}`;
}

/** What comes after a cleared level, in one line. Null while the level is not cleared. */
export function whatNext(summary: LevelSummary, locale: AttemptLocale): string | null {
  if (summary.status !== 'cleared') return null;
  const next = summary.level + 1;
  if (summary.level === 1) {
    return locale === 'ja'
      ? `つぎは修了テスト（10 問）か、レベル ${next} へ。`
      : `Next: the final test (10 questions), or level ${next}.`;
  }
  return locale === 'ja'
    ? 'つぎは修了テスト（10 問）で、力をたしかめましょう。'
    : 'Next: try the final test (10 questions).';
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

  const kinds = LEVEL_KINDS[level].length;
  if (ja) {
    const every =
      kinds > 0
        ? `解き、このレベルの ${kinds} 種類の問題のどれも、いちばん最近の 1 問が解けていると達成です。解けなかった種類は、次にその種類が出たときに解けば大丈夫です。同じ問題をやり直しても、数え方は変わりません。`
        : `、${CLEAR_MIN_TEMPLATES} 種類以上にわたって解けると達成です。`;
    return `直近 ${counted} 問のうち、${COUNTED_HOW.ja}解けたのは ${solved} 問（${solvedTemplates} 種類）です。${notCounted(summary, true)}レベル ${level} は、直近 ${WINDOW_SIZE} 問のうち ${CLEAR_MIN_SOLVED} 問をそのように${every}`;
  }
  const every =
    kinds > 0
      ? `, with the latest exercise of each of its ${kinds} kinds of task among the solved. A kind you missed is made good the next time it comes up. Doing the same exercise again does not change how it counts.`
      : `, across at least ${CLEAR_MIN_TEMPLATES} kinds.`;
  return `You solved ${solved} of your last ${counted} exercises ${COUNTED_HOW.en} across ${solvedTemplates} ${solvedTemplates === 1 ? 'kind' : 'kinds'} of exercise.${notCounted(summary, false)} Level ${level} is cleared at ${CLEAR_MIN_SOLVED} of the last ${WINDOW_SIZE} solved that way${every}`;
}
