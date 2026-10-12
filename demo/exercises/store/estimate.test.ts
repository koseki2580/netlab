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
  LEVEL_KINDS,
  stillMissing,
  whatNext,
  isSolvedAfterTries,
} from './estimate';
import { attempt, clearingRun, failed, helped, solved, solvedRun } from './testSupport';
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

// TC-584, TC-608
describe('of every kind of task the level has, the latest one must be solved', () => {
  const kinds = LEVEL_KINDS[1];
  const [first = '', second = ''] = kinds;
  const titleOf = (id: string) => ({ en: `T ${id}`, ja: `題 ${id}` });

  it('a level is not cleared while a kind it has was never tried, however many of the others were solved', () => {
    const attempts = solvedRun(1, 10, kinds.length - 1);
    const summary = levelSummary(attempts, 1);
    expect(summary).toMatchObject({ solved: 10, status: 'in-progress' });
    expect(summary.missingKinds).toEqual([kinds[kinds.length - 1]]);
    expect(headline(summary, 'ja')).toBe(
      'あとは、まだ解けていない種類が解ければ、レベル 1 達成です（いま 10 問）',
    );
    expect(stillMissing(summary, 'ja', titleOf)).toBe(
      `まだ解けていない種類：「題 ${kinds[kinds.length - 1]}」`,
    );
    expect(stillMissing(summary, 'en', titleOf)).toBe(
      `Kinds of task not solved yet: "T ${kinds[kinds.length - 1]}"`,
    );
  });

  it('a kind that went wrong the last time keeps the level open, though eight others were solved', () => {
    const attempts = [...clearingRun(1), solved(second, 50, 1), failed(first, 51, 1)];
    const summary = levelSummary(attempts, 1);
    expect(summary).toMatchObject({ counted: 9, solved: 8, status: 'in-progress' });
    expect(summary.missingKinds).toEqual([first]);
  });

  it('and is made good by solving the next exercise of that kind', () => {
    const attempts = [...clearingRun(1), failed(first, 51, 1), solved(first, 52, 1)];
    expect(levelSummary(attempts, 1)).toMatchObject({ status: 'cleared', missingKinds: [] });
  });

  it('solving the same exercise again does not make it good', () => {
    const attempts = [...clearingRun(1), failed(first, 51, 1), solved(first, 51, 1)];
    expect(levelSummary(attempts, 1).missingKinds).toEqual([first]);
  });

  it('a kind solved before the last ten still stands, as long as nothing of that kind went wrong since', () => {
    const others = Array.from({ length: 10 }, (_, i) => solved(second, 200 + i, 1));
    expect(levelSummary([...clearingRun(1), ...others], 1).missingKinds).toEqual([]);
  });

  it('names two kinds and counts the rest', () => {
    const summary = levelSummary(solvedRun(1, 6, 2), 1);
    expect(summary.missingKinds).toHaveLength(kinds.length - 2);
    expect(stillMissing(summary, 'ja', titleOf)).toBe(
      `まだ解けていない種類：「題 ${kinds[2]}」「題 ${kinds[3]}」 ほか ${kinds.length - 4} 種類`,
    );
    expect(stillMissing(summary, 'en', titleOf)).toBe(
      `Kinds of task not solved yet: "T ${kinds[2]}", "T ${kinds[3]}" and ${kinds.length - 4} more`,
    );
  });

  it('says nothing of kinds before there is a verdict, or once the level is cleared; then it says what is next', () => {
    expect(stillMissing(levelSummary(solvedRun(1, 2, 2), 1), 'ja', titleOf)).toBeNull();
    const cleared = levelSummary(clearingRun(1), 1);
    expect(stillMissing(cleared, 'ja', titleOf)).toBeNull();
    expect(whatNext(cleared, 'ja')).toBe('つぎは修了テスト（10 問）か、レベル 2 へ。');
    expect(whatNext(cleared, 'en')).toBe('Next: the final test (10 questions), or level 2.');
    expect(whatNext(levelSummary(solvedRun(1, 6, 2), 1), 'ja')).toBeNull();
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

  // TC-587
  it('counts on the first Check only where the answer is one of a few things to press', () => {
    const pressed = (seed: number, checkPresses: number) =>
      attempt('t', seed, 1, { checkPresses, checksToCount: 1 });
    expect(isSolved(pressed(0, 1))).toBe(true);
    expect(isSolved(pressed(1, 2))).toBe(false);
    expect(isSolvedAfterTries(pressed(1, 2))).toBe(true);
    // A record written before the rule existed has no such field: two Checks, as it was told then.
    expect(isSolved(tries(1, 2))).toBe(true);
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
    expect(levelSummary([...clearingRun(1), ...later], 1)).toMatchObject({
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
      missingKinds: LEVEL_KINDS[2],
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

  it('clears a level at seven solved of the last ten, every kind of task among them', () => {
    const attempts = [failed('l1-x', 50, 1), failed('l1-x', 51, 1), ...clearingRun(1)];
    const summary = levelSummary(attempts, 1);
    expect(summary).toMatchObject({
      counted: 9,
      solved: 7,
      notSolved: 2,
      solvedTemplates: 7,
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

  // TC-456, TC-598
  it('counts one exercise once, by the FIRST attempt the learner was judged on', () => {
    const retried = [failed('a', 0, 1), failed('a', 0, 1), solved('a', 0, 1)];
    expect(levelSummary(retried, 1)).toMatchObject({ counted: 1, solved: 0, notSolved: 1 });

    const lostAgain = [solved('a', 0, 1), failed('a', 0, 1)];
    expect(levelSummary(lostAgain, 1)).toMatchObject({ counted: 1, solved: 1, notSolved: 0 });
  });

  // TC-598
  it('does not let a reopened exercise hide the answer that was shown the first time', () => {
    const shown = attempt('a', 0, 1, { outcome: 'gave-up', revealed: true, checkPresses: 0 });
    expect(levelSummary([shown, solved('a', 0, 1)], 1)).toMatchObject({
      counted: 1,
      solved: 0,
      notSolved: 1,
    });
  });

  // TC-598
  it('an exercise that was only opened the first time is judged on the visit that pressed Check', () => {
    const opened = attempt('a', 0, 1, { outcome: 'abandoned', checkPresses: 0 });
    expect(levelSummary([opened, solved('a', 0, 1)], 1)).toMatchObject({ counted: 1, solved: 1 });
  });

  // TC-598
  it('seven misses, each followed by a clean solve of the same exercise, clear nothing', () => {
    const attempts = solvedRun(1, 8, 4).flatMap((clean) => [
      {
        ...clean,
        id: `${clean.id}-miss`,
        startedAt: clean.startedAt - 1,
        outcome: 'abandoned' as const,
        firstCheckPassed: false,
      },
      clean,
    ]);
    expect(levelSummary(attempts, 1)).toMatchObject({
      counted: 8,
      solved: 0,
      status: 'in-progress',
    });
  });

  // TC-598
  it('places an exercise in the last ten by when it was first judged, not by when it was reopened', () => {
    const old = failed('l1-old', 0, 1);
    const ten = solvedRun(1, 10, 3, 100);
    // Reopened and solved at the very end: it is still the eleventh from the end, and still a miss.
    const summary = levelSummary([old, ...ten, solved('l1-old', 0, 1)], 1);
    expect(summary).toMatchObject({ counted: 10, solved: 10, notSolved: 0 });
  });

  // TC-598
  it('an exercise first met in the set before studying is never counted, whatever happens later', () => {
    const pre = attempt('a', 0, 1, { context: 'pre', outcome: 'abandoned' });
    expect(levelSummary([pre, solved('a', 0, 1)], 1)).toMatchObject({ counted: 0 });
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
    const summary = levelSummary([...clearingRun(2, 100), ...pre], 2);
    expect(summary).toMatchObject({ counted: 10, solved: 10, notSolved: 0, status: 'cleared' });
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
    expect(estimatedLevel(clearingRun(1))).toBe(1);
    expect(estimatedLevel([...clearingRun(1), ...clearingRun(2)])).toBe(2);
  });

  it('stops at a gap: level 3 cleared but level 2 not', () => {
    const attempts = [...clearingRun(1), ...solvedRun(2, 5, 3), ...clearingRun(3)];
    expect(estimatedLevel(attempts)).toBe(1);
  });

  it('is 0 when a level is cleared but level 1 is not', () => {
    expect(estimatedLevel(clearingRun(2))).toBe(0);
  });

  it('lets placement stand in for the lower levels', () => {
    const attempts = [...clearingRun(1), ...clearingRun(3)];
    expect(estimatedLevel(attempts, placement(2))).toBe(3);
    expect(estimatedLevel(clearingRun(3), placement(2))).toBe(3);
  });

  it('does not let placement stand in for a level above its result', () => {
    expect(estimatedLevel(clearingRun(3), placement(1))).toBe(0);
    expect(estimatedLevel(clearingRun(3), placement(0))).toBe(0);
  });

  it('needs the level itself cleared by attempts: placement alone gives 0', () => {
    expect(estimatedLevel([], placement(3))).toBe(0);
  });
});

// TC-459
describe('explain', () => {
  const cleared = levelSummary([...[0, 1, 2].map((i) => failed('x', i, 1)), ...clearingRun(1)], 1);
  const notEnough = levelSummary(solvedRun(2, 3, 3), 2);
  const none = levelSummary([], 2);
  const inProgress = levelSummary(
    [...solvedRun(2, 4, 2), helped('h', 40, 2), failed('x', 41, 2)],
    2,
  );

  it('says a level is cleared, with the numbers', () => {
    expect(explain(cleared, 'ja')).toBe(
      '直近 10 問のうち 7 問を、ヒントなしで、1 回目の「たしかめる」（自分で入力する問題は 2 回目まで）で解けました（7 種類）。レベル 1 は達成です。',
    );
    expect(explain(cleared, 'en')).toBe(
      'You solved 7 of your last 10 exercises without a hint, on the first Check (within 2 Checks where you type the answer), across 7 kinds of exercise. Level 1 is cleared.',
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
      '直近 6 問のうち、ヒントなしで、1 回目の「たしかめる」（自分で入力する問題は 2 回目まで）で解けたのは 4 問（2 種類）です。ヒントを使って解けた 1 問は数えていません。レベル 2 は、直近 10 問のうち 7 問をそのように解き、このレベルの 10 種類の問題のどれも、いちばん最近の 1 問が解けていると達成です。解けなかった種類は、次にその種類が出たときに解けば大丈夫です。同じ問題をやり直しても、数え方は変わりません。',
    );
    expect(explain(inProgress, 'en')).toBe(
      'You solved 4 of your last 6 exercises without a hint, on the first Check (within 2 Checks where you type the answer), across 2 kinds of exercise. The 1 you solved with a hint is not counted. Level 2 is cleared at 7 of the last 10 solved that way, with the latest exercise of each of its 10 kinds of task among the solved. A kind you missed is made good the next time it comes up. Doing the same exercise again does not change how it counts.',
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
    const cleared = levelSummary(clearingRun(1), 1);
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
