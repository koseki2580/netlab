import { describe, expect, it } from 'vitest';
import {
  CLEAR_MIN_SOLVED,
  CLEAR_MIN_TEMPLATES,
  MIN_ATTEMPTED,
  WINDOW_SIZE,
  estimatedLevel,
  MAX_CHECKS_TO_COUNT,
  explain,
  headline,
  isAttempted,
  isSolved,
  levelSummary,
} from './estimate';
import { attempt, failed, helped, solved, solvedRun } from './testSupport';
import type { PlacementResult } from './types';

const JAPANESE = /[぀-ヿ一-龯]/;

// TC-454
describe('thresholds', () => {
  it('are the ones the plan names', () => {
    expect([WINDOW_SIZE, MIN_ATTEMPTED, CLEAR_MIN_SOLVED, CLEAR_MIN_TEMPLATES]).toEqual([
      10, 5, 7, 3,
    ]);
  });
});

// TC-454
describe('isSolved', () => {
  it('is true for a pass with no hint and no reveal', () => {
    expect(isSolved(solved('t', 0, 1))).toBe(true);
  });

  it('is false when a hint was used', () => {
    expect(isSolved(helped('t', 0, 1))).toBe(false);
  });

  it('is false when the answer was revealed, whatever the outcome says', () => {
    expect(isSolved(attempt('t', 0, 1, { revealed: true, outcome: 'gave-up' }))).toBe(false);
    expect(isSolved(attempt('t', 0, 1, { revealed: true, outcome: 'passed' }))).toBe(false);
  });

  it('is false for an attempt left without passing', () => {
    expect(isSolved(failed('t', 0, 1))).toBe(false);
  });
});

// TC-538
describe('a solve that took more than two Checks', () => {
  const tries = (seed: number, checkPresses: number) =>
    attempt('t', seed, 1, { checkPresses, firstCheckPassed: checkPresses === 1 });

  it('counts at one or two Checks, and not from the third on', () => {
    expect(MAX_CHECKS_TO_COUNT).toBe(2);
    expect(isSolved(tries(0, 1))).toBe(true);
    expect(isSolved(tries(1, 2))).toBe(true);
    expect(isSolved(tries(2, 3))).toBe(false);
    expect(isSolved(tries(3, 4))).toBe(false);
  });

  it('is counted apart from solved and from solved with a hint, and never as not solved', () => {
    const summary = levelSummary([tries(0, 1), tries(1, 4), helped('t', 2, 1)], 1);
    expect(summary).toMatchObject({
      counted: 3,
      solved: 1,
      solvedWithHelp: 1,
      solvedAfterTries: 1,
      notSolved: 0,
    });
    expect(summary.weakestTemplateId).toBeNull();
  });

  it('does not clear a level: ten exercises each solved on the fourth Check', () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      attempt(`l1-t${i % 4}`, i, 1, { checkPresses: 4, firstCheckPassed: false }),
    );
    expect(levelSummary(attempts, 1)).toMatchObject({
      solved: 0,
      solvedAfterTries: 10,
      status: 'in-progress',
    });
  });
});

// TC-539
describe('an exercise that was only opened', () => {
  const opened = (templateId: string, seed: number) =>
    attempt(templateId, seed, 1, {
      outcome: 'abandoned',
      checkPresses: 0,
      firstCheckPassed: false,
    });

  it('is an attempt once Check was pressed or the answer was shown, not before', () => {
    expect(isAttempted(opened('a', 0))).toBe(false);
    expect(isAttempted(failed('a', 0, 1))).toBe(true);
    expect(
      isAttempted(attempt('a', 0, 1, { outcome: 'gave-up', revealed: true, checkPresses: 0 })),
    ).toBe(true);
  });

  it('is not counted in the window and is not the weakest kind', () => {
    const attempts = [...solvedRun(1, 6, 3), opened('l1-seen', 50), opened('l1-seen', 51)];
    expect(levelSummary(attempts, 1)).toMatchObject({
      counted: 6,
      solved: 6,
      notSolved: 0,
      weakestTemplateId: null,
    });
  });

  it('does not hide an earlier solve of the same exercise', () => {
    expect(levelSummary([solved('a', 0, 1), opened('a', 0)], 1)).toMatchObject({
      counted: 1,
      solved: 1,
    });
  });

  it('does not push a counted exercise out of the last ten', () => {
    const later = Array.from({ length: 10 }, (_, i) => opened('l1-seen', 100 + i));
    expect(levelSummary([...solvedRun(1, 7, 3), ...later], 1)).toMatchObject({
      counted: 7,
      status: 'cleared',
    });
  });
});

// TC-455
describe('levelSummary', () => {
  it('reports not-enough with nothing attempted', () => {
    expect(levelSummary([], 2)).toEqual({
      level: 2,
      counted: 0,
      solved: 0,
      solvedWithHelp: 0,
      solvedAfterTries: 0,
      notSolved: 0,
      solvedTemplates: 0,
      status: 'not-enough',
      weakestTemplateId: null,
    });
  });

  it('reports not-enough below five distinct exercises, even when all are solved', () => {
    const summary = levelSummary(solvedRun(1, 4, 4), 1);
    expect(summary.counted).toBe(4);
    expect(summary.solved).toBe(4);
    expect(summary.status).toBe('not-enough');
  });

  it('leaves not-enough at five', () => {
    expect(levelSummary(solvedRun(1, 5, 3), 1).status).toBe('in-progress');
  });

  it('clears a level at seven solved across three templates', () => {
    const attempts = [...solvedRun(2, 7, 3), failed('l2-x', 50, 2), failed('l2-x', 51, 2)];
    const summary = levelSummary(attempts, 2);
    expect(summary).toMatchObject({
      counted: 9,
      solved: 7,
      notSolved: 2,
      solvedTemplates: 3,
      status: 'cleared',
    });
  });

  it('does not clear at six solved', () => {
    const attempts = [...solvedRun(2, 6, 3), ...[0, 1, 2, 3].map((i) => failed('l2-x', 50 + i, 2))];
    expect(levelSummary(attempts, 2).status).toBe('in-progress');
  });

  it('does not clear when the solved exercises come from fewer than three templates', () => {
    const summary = levelSummary(solvedRun(2, 10, 2), 2);
    expect(summary.solved).toBe(10);
    expect(summary.solvedTemplates).toBe(2);
    expect(summary.status).toBe('in-progress');
  });

  it('counts templates among the solved only', () => {
    const attempts = [...solvedRun(2, 7, 2), failed('l2-third', 90, 2), helped('l2-fourth', 91, 2)];
    const summary = levelSummary(attempts, 2);
    expect(summary.solvedTemplates).toBe(2);
    expect(summary.status).toBe('in-progress');
  });

  it('separates solved, solved with help and not solved', () => {
    const attempts = [
      solved('a', 0, 1),
      helped('a', 1, 1),
      failed('b', 2, 1),
      attempt('b', 3, 1, { outcome: 'gave-up', revealed: true }),
      attempt('c', 4, 1, { outcome: 'passed', revealed: true }),
    ];
    expect(levelSummary(attempts, 1)).toMatchObject({
      counted: 5,
      solved: 1,
      solvedWithHelp: 1,
      notSolved: 3,
    });
  });

  // TC-456
  it('counts one exercise once, by its latest attempt', () => {
    const retried = [failed('a', 0, 1), failed('a', 0, 1), solved('a', 0, 1)];
    expect(levelSummary(retried, 1)).toMatchObject({ counted: 1, solved: 1, notSolved: 0 });

    const lostAgain = [solved('a', 0, 1), failed('a', 0, 1)];
    expect(levelSummary(lostAgain, 1)).toMatchObject({ counted: 1, solved: 0, notSolved: 1 });
  });

  // TC-456
  it('does not let ten retries of one exercise clear a level', () => {
    const attempts = Array.from({ length: 10 }, () => solved('a', 0, 1));
    expect(levelSummary(attempts, 1)).toMatchObject({ counted: 1, status: 'not-enough' });
  });

  // TC-456
  it('looks at the last ten distinct exercises only', () => {
    const old = Array.from({ length: 6 }, (_, i) => failed('l3-old', i, 3));
    const summary = levelSummary([...old, ...solvedRun(3, 10, 3, 100)], 3);
    expect(summary).toMatchObject({ counted: 10, solved: 10, notSolved: 0, status: 'cleared' });
  });

  // TC-456
  it('orders by start time, not by position in the list', () => {
    const recent = solvedRun(3, 10, 3, 100);
    const old = Array.from({ length: 6 }, (_, i) =>
      attempt('l3-old', i, 3, { outcome: 'abandoned', startedAt: i }),
    );
    expect(levelSummary([...recent, ...old], 3)).toMatchObject({ solved: 10, notSolved: 0 });
  });

  // TC-456
  it('ignores other levels', () => {
    expect(levelSummary(solvedRun(1, 10, 4), 2).counted).toBe(0);
  });

  // TC-456
  it('counts practice, placement and post attempts', () => {
    const attempts = [
      attempt('a', 0, 1, { context: 'practice' }),
      attempt('b', 1, 1, { context: 'placement' }),
      attempt('c', 2, 1, { context: 'post' }),
    ];
    expect(levelSummary(attempts, 1)).toMatchObject({ counted: 3, solved: 3 });
  });

  // TC-456
  it('excludes pre attempts, so a diagnostic before studying does not hold the learner back', () => {
    const pre = [0, 1, 2, 3].map((i) =>
      attempt('l2-pre', i, 2, { context: 'pre', outcome: 'abandoned' }),
    );
    const summary = levelSummary([...solvedRun(2, 7, 3, 100), ...pre], 2);
    expect(summary).toMatchObject({ counted: 7, solved: 7, notSolved: 0, status: 'cleared' });
  });

  // TC-456
  it('does not let a later pre attempt replace a counted attempt at the same exercise', () => {
    const attempts = [
      solved('a', 0, 1),
      attempt('a', 0, 1, { context: 'pre', outcome: 'abandoned' }),
    ];
    expect(levelSummary(attempts, 1)).toMatchObject({ counted: 1, solved: 1 });
  });

  // TC-457
  it('names the template with the most unsolved exercises as the weakest', () => {
    const attempts = [
      failed('l2-vlan', 0, 2),
      failed('l2-stp', 1, 2),
      failed('l2-stp', 2, 2),
      solved('l2-acl', 3, 2),
    ];
    expect(levelSummary(attempts, 2).weakestTemplateId).toBe('l2-stp');
  });

  // TC-457
  it('breaks a tie for the weakest template by the most recent failure', () => {
    const attempts = [failed('l2-stp', 0, 2), failed('l2-vlan', 1, 2), solved('l2-acl', 2, 2)];
    expect(levelSummary(attempts, 2).weakestTemplateId).toBe('l2-vlan');
  });

  // TC-457
  it('has no weakest template when nothing is unsolved', () => {
    const attempts = [solved('a', 0, 2), helped('b', 1, 2)];
    expect(levelSummary(attempts, 2).weakestTemplateId).toBeNull();
  });
});

// TC-458
describe('estimatedLevel', () => {
  const placement = (level: PlacementResult['level']): PlacementResult => ({
    level,
    exercises: 4,
    completedAt: 1,
  });

  it('is 0 with no attempts', () => {
    expect(estimatedLevel([])).toBe(0);
  });

  it('is the highest level of an unbroken run of cleared levels', () => {
    expect(estimatedLevel(solvedRun(1, 7, 3))).toBe(1);
    expect(estimatedLevel([...solvedRun(1, 7, 3), ...solvedRun(2, 7, 3)])).toBe(2);
  });

  it('stops at a gap: level 3 cleared but level 2 not', () => {
    const attempts = [...solvedRun(1, 7, 3), ...solvedRun(2, 5, 3), ...solvedRun(3, 7, 3)];
    expect(estimatedLevel(attempts)).toBe(1);
  });

  it('is 0 when a level is cleared but level 1 is not', () => {
    expect(estimatedLevel(solvedRun(2, 7, 3))).toBe(0);
  });

  it('lets placement stand in for the lower levels', () => {
    const attempts = [...solvedRun(1, 7, 3), ...solvedRun(3, 7, 3)];
    expect(estimatedLevel(attempts, placement(2))).toBe(3);
    expect(estimatedLevel(solvedRun(3, 7, 3), placement(2))).toBe(3);
  });

  it('does not let placement stand in for a level above its result', () => {
    expect(estimatedLevel(solvedRun(3, 7, 3), placement(1))).toBe(0);
    expect(estimatedLevel(solvedRun(3, 7, 3), placement(0))).toBe(0);
  });

  it('needs the level itself cleared by attempts: placement alone gives 0', () => {
    expect(estimatedLevel([], placement(3))).toBe(0);
  });
});

// TC-459
describe('explain', () => {
  const cleared = levelSummary(
    [...solvedRun(2, 7, 3), ...[0, 1, 2].map((i) => failed('x', i, 2))],
    2,
  );
  const notEnough = levelSummary(solvedRun(2, 3, 3), 2);
  const none = levelSummary([], 2);
  const inProgress = levelSummary(
    [...solvedRun(2, 4, 2), helped('h', 40, 2), failed('x', 41, 2)],
    2,
  );

  it('says a level is cleared, with the numbers', () => {
    expect(explain(cleared, 'ja')).toBe(
      '直近 10 問のうち 7 問を、ヒントなし・「たしかめる」2 回までで解けました（3 種類）。レベル 2 は達成です。',
    );
    expect(explain(cleared, 'en')).toBe(
      'You solved 7 of your last 10 exercises without a hint and within 2 Checks, across 3 kinds of exercise. Level 2 is cleared.',
    );
  });

  it('says how many more are needed before a level can be judged', () => {
    expect(explain(notEnough, 'ja')).toBe(
      'レベル 2 で「たしかめる」まで進んだのは、まだ 3 問です。あと 2 問取り組むと、判定できます。',
    );
    expect(explain(notEnough, 'en')).toBe(
      'You have pressed Check on 3 exercises at level 2 so far. Try 2 more and this level can be judged.',
    );
    expect(explain(none, 'ja')).toContain('あと 5 問');
    expect(explain(none, 'en')).toContain('Try 5 more');
  });

  it('says what an unfinished level still needs', () => {
    expect(explain(inProgress, 'ja')).toBe(
      '直近 6 問のうち、ヒントなし・「たしかめる」2 回までで解けたのは 4 問（2 種類）です。ヒントを使って解けた 1 問は数えていません。レベル 2 は、直近 10 問のうち 7 問を、3 種類以上にわたって、ヒントなし・「たしかめる」2 回までで解けると達成です。',
    );
    expect(explain(inProgress, 'en')).toBe(
      'You solved 4 of your last 6 exercises without a hint and within 2 Checks, across 2 kinds of exercise. The 1 you solved with a hint is not counted. Level 2 is cleared at 7 of the last 10 solved that way, across at least 3 kinds.',
    );
  });

  it('uses the singular in English for one', () => {
    const one = levelSummary([solved('a', 0, 1)], 1);
    expect(explain(one, 'en')).toBe(
      'You have pressed Check on 1 exercise at level 1 so far. Try 4 more and this level can be judged.',
    );
  });

  it('is never empty, and Japanese is in Japanese', () => {
    for (const summary of [cleared, notEnough, none, inProgress]) {
      expect(explain(summary, 'en').length).toBeGreaterThan(0);
      expect(explain(summary, 'en')).not.toMatch(JAPANESE);
      expect(explain(summary, 'ja')).toMatch(JAPANESE);
    }
  });
});

// TC-540
describe('the sentences for a solve after several tries, and the short line', () => {
  const tried = levelSummary(
    [
      ...solvedRun(2, 4, 2),
      attempt('h', 40, 2, { checkPresses: 4, firstCheckPassed: false }),
      attempt('h', 41, 2, { checkPresses: 3, firstCheckPassed: false }),
      helped('h', 42, 2),
    ],
    2,
  );

  it('says the solves after several tries are not counted', () => {
    expect(explain(tried, 'ja')).toContain(
      'ヒントを使って解けた 1 問と、何度かためして解けた 2 問は数えていません。',
    );
    expect(explain(tried, 'en')).toContain(
      'The 1 you solved with a hint and the 2 you solved after several tries are not counted.',
    );
  });

  it('leads with how many more are needed to clear', () => {
    expect(headline(tried, 'ja')).toBe('あと 3 問 とけたら、レベル 2 達成です（いま 4 問）');
    expect(headline(tried, 'en')).toBe('Solve 3 more to clear level 2 (4 so far)');
  });

  it('says a cleared level in one short line', () => {
    const cleared = levelSummary(solvedRun(1, 7, 3), 1);
    expect(headline(cleared, 'ja')).toBe('レベル 1 達成です');
    expect(headline(cleared, 'en')).toBe('Level 1 cleared');
  });

  it('says how many more to try before there is a verdict', () => {
    expect(headline(levelSummary(solvedRun(1, 2, 2), 1), 'ja')).toBe(
      'あと 3 問やると、判定できます',
    );
    expect(headline(levelSummary([], 1), 'en')).toBe('Do 5 more and this level can be judged');
    expect(headline(levelSummary(solvedRun(1, 4, 2), 1), 'en')).toBe(
      'Do 1 more and this level can be judged',
    );
  });

  it('asks for other kinds when seven are solved from too few kinds', () => {
    const narrow = levelSummary(solvedRun(2, 8, 2), 2);
    expect(headline(narrow, 'ja')).toBe(
      'ちがう種類の問題が あと 1 種類 とけたら、レベル 2 達成です（いま 2 種類）',
    );
    expect(headline(narrow, 'en')).toBe(
      'Solve 1 more kind of exercise to clear level 2 (2 kinds so far)',
    );
  });
});
