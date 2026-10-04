import { describe, expect, it } from 'vitest';
import {
  CLEAR_MIN_SOLVED,
  CLEAR_MIN_TEMPLATES,
  MIN_ATTEMPTED,
  WINDOW_SIZE,
  estimatedLevel,
  explain,
  isSolved,
  levelSummary,
} from './estimate';
import { attempt, failed, helped, solved, solvedRun } from './testSupport';
import type { PlacementResult } from './types';

const JAPANESE = /[぀-ヿ一-龯]/;

describe('thresholds', () => {
  it('are the ones the plan names', () => {
    expect([WINDOW_SIZE, MIN_ATTEMPTED, CLEAR_MIN_SOLVED, CLEAR_MIN_TEMPLATES]).toEqual([
      10, 5, 7, 3,
    ]);
  });
});

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

describe('levelSummary', () => {
  it('reports not-enough with nothing attempted', () => {
    expect(levelSummary([], 2)).toEqual({
      level: 2,
      counted: 0,
      solved: 0,
      solvedWithHelp: 0,
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

  it('counts one exercise once, by its latest attempt', () => {
    const retried = [failed('a', 0, 1), failed('a', 0, 1), solved('a', 0, 1)];
    expect(levelSummary(retried, 1)).toMatchObject({ counted: 1, solved: 1, notSolved: 0 });

    const lostAgain = [solved('a', 0, 1), failed('a', 0, 1)];
    expect(levelSummary(lostAgain, 1)).toMatchObject({ counted: 1, solved: 0, notSolved: 1 });
  });

  it('does not let ten retries of one exercise clear a level', () => {
    const attempts = Array.from({ length: 10 }, () => solved('a', 0, 1));
    expect(levelSummary(attempts, 1)).toMatchObject({ counted: 1, status: 'not-enough' });
  });

  it('looks at the last ten distinct exercises only', () => {
    const old = Array.from({ length: 6 }, (_, i) => failed('l3-old', i, 3));
    const summary = levelSummary([...old, ...solvedRun(3, 10, 3, 100)], 3);
    expect(summary).toMatchObject({ counted: 10, solved: 10, notSolved: 0, status: 'cleared' });
  });

  it('orders by start time, not by position in the list', () => {
    const recent = solvedRun(3, 10, 3, 100);
    const old = Array.from({ length: 6 }, (_, i) =>
      attempt('l3-old', i, 3, { outcome: 'abandoned', startedAt: i }),
    );
    expect(levelSummary([...recent, ...old], 3)).toMatchObject({ solved: 10, notSolved: 0 });
  });

  it('ignores other levels', () => {
    expect(levelSummary(solvedRun(1, 10, 4), 2).counted).toBe(0);
  });

  it('counts practice, placement and post attempts', () => {
    const attempts = [
      attempt('a', 0, 1, { context: 'practice' }),
      attempt('b', 1, 1, { context: 'placement' }),
      attempt('c', 2, 1, { context: 'post' }),
    ];
    expect(levelSummary(attempts, 1)).toMatchObject({ counted: 3, solved: 3 });
  });

  it('excludes pre attempts, so a diagnostic before studying does not hold the learner back', () => {
    const pre = [0, 1, 2, 3].map((i) =>
      attempt('l2-pre', i, 2, { context: 'pre', outcome: 'abandoned' }),
    );
    const summary = levelSummary([...solvedRun(2, 7, 3, 100), ...pre], 2);
    expect(summary).toMatchObject({ counted: 7, solved: 7, notSolved: 0, status: 'cleared' });
  });

  it('does not let a later pre attempt replace a counted attempt at the same exercise', () => {
    const attempts = [
      solved('a', 0, 1),
      attempt('a', 0, 1, { context: 'pre', outcome: 'abandoned' }),
    ];
    expect(levelSummary(attempts, 1)).toMatchObject({ counted: 1, solved: 1 });
  });

  it('names the template with the most unsolved exercises as the weakest', () => {
    const attempts = [
      failed('l2-vlan', 0, 2),
      failed('l2-stp', 1, 2),
      failed('l2-stp', 2, 2),
      solved('l2-acl', 3, 2),
    ];
    expect(levelSummary(attempts, 2).weakestTemplateId).toBe('l2-stp');
  });

  it('breaks a tie for the weakest template by the most recent failure', () => {
    const attempts = [failed('l2-stp', 0, 2), failed('l2-vlan', 1, 2), solved('l2-acl', 2, 2)];
    expect(levelSummary(attempts, 2).weakestTemplateId).toBe('l2-vlan');
  });

  it('has no weakest template when nothing is unsolved', () => {
    const attempts = [solved('a', 0, 2), helped('b', 1, 2)];
    expect(levelSummary(attempts, 2).weakestTemplateId).toBeNull();
  });
});

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
      '直近 10 問のうち 7 問を、ヒントなしで解けました（3 種類）。レベル 2 は達成です。',
    );
    expect(explain(cleared, 'en')).toBe(
      'You solved 7 of your last 10 exercises without a hint, across 3 kinds of exercise. Level 2 is cleared.',
    );
  });

  it('says how many more are needed before a level can be judged', () => {
    expect(explain(notEnough, 'ja')).toBe(
      'レベル 2 で取り組んだのは、まだ 3 問です。あと 2 問取り組むと、判定できます。',
    );
    expect(explain(notEnough, 'en')).toBe(
      'You have tried 3 exercises at level 2 so far. Try 2 more and this level can be judged.',
    );
    expect(explain(none, 'ja')).toContain('あと 5 問');
    expect(explain(none, 'en')).toContain('Try 5 more');
  });

  it('says what an unfinished level still needs', () => {
    expect(explain(inProgress, 'ja')).toBe(
      '直近 6 問のうち、ヒントなしで解けたのは 4 問（2 種類）です。ヒントを使って解けた 1 問は数えていません。レベル 2 は、直近 10 問のうち 7 問を、3 種類以上にわたってヒントなしで解けると達成です。',
    );
    expect(explain(inProgress, 'en')).toBe(
      'You solved 4 of your last 6 exercises without a hint, across 2 kinds of exercise. The 1 you solved with a hint is not counted. Level 2 is cleared at 7 of the last 10, across at least 3 kinds.',
    );
  });

  it('uses the singular in English for one', () => {
    const one = levelSummary([solved('a', 0, 1)], 1);
    expect(explain(one, 'en')).toBe(
      'You have tried 1 exercise at level 1 so far. Try 4 more and this level can be judged.',
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
