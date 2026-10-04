import { describe, expect, it } from 'vitest';
import { cycleReport, postSet, recordLessonOpened, startCycle } from './studyCycle';
import { attempt } from './testSupport';
import type { AttemptRecord } from './types';

const four = ['l2-vlan-access', 'l2-stp-root', 'l2-static-missing', 'l2-acl-permit'];

describe('startCycle', () => {
  it('fixes four "before" instances from seed block A, one per template', () => {
    const cycle = startCycle(2, four, 5000);
    expect(cycle).toEqual({
      id: 'cycle-2-5000',
      level: 2,
      templateIds: four,
      startedAt: 5000,
      preExerciseIds: [
        'l2-vlan-access~0',
        'l2-stp-root~1',
        'l2-static-missing~2',
        'l2-acl-permit~3',
      ],
      lessonsOpened: [],
    });
  });

  it('goes round the templates again when there are fewer than four', () => {
    expect(startCycle(1, ['a', 'b'], 1).preExerciseIds).toEqual(['a~0', 'b~1', 'a~2', 'b~3']);
    expect(startCycle(1, ['a'], 1).preExerciseIds).toEqual(['a~0', 'a~1', 'a~2', 'a~3']);
  });

  it('uses the first four of a longer list', () => {
    const cycle = startCycle(1, ['a', 'b', 'c', 'd', 'e'], 1);
    expect(cycle.preExerciseIds).toEqual(['a~0', 'b~1', 'c~2', 'd~3']);
  });

  it('drops a repeated template', () => {
    expect(startCycle(1, ['a', 'a', 'b'], 1).templateIds).toEqual(['a', 'b']);
  });

  it('has no instances without templates', () => {
    const cycle = startCycle(1, [], 1);
    expect(cycle.preExerciseIds).toEqual([]);
    expect(postSet(cycle)).toEqual([]);
  });

  it('is plain data', () => {
    const cycle = startCycle(2, four, 5000);
    expect(JSON.parse(JSON.stringify(cycle))).toEqual(cycle);
  });
});

describe('postSet', () => {
  it('uses the same templates with seed block B', () => {
    expect(postSet(startCycle(2, four, 5000))).toEqual([
      'l2-vlan-access~1000',
      'l2-stp-root~1001',
      'l2-static-missing~1002',
      'l2-acl-permit~1003',
    ]);
  });

  it('shares no instance with the "before" set, for any number of templates', () => {
    for (const templateIds of [['a'], ['a', 'b'], ['a', 'b', 'c'], four]) {
      const cycle = startCycle(2, templateIds, 1);
      const post = postSet(cycle);
      expect(post).toHaveLength(4);
      expect(new Set([...cycle.preExerciseIds, ...post]).size).toBe(8);
      const template = (id: string) => id.split('~')[0];
      expect(post.map(template)).toEqual(cycle.preExerciseIds.map(template));
    }
  });
});

describe('recordLessonOpened', () => {
  it('lists each lesson once, in the order first opened', () => {
    let cycle = startCycle(2, four, 1);
    cycle = recordLessonOpened(cycle, '/networking/vlan');
    cycle = recordLessonOpened(cycle, '/networking/stp');
    cycle = recordLessonOpened(cycle, '/networking/vlan');
    expect(cycle.lessonsOpened).toEqual(['/networking/vlan', '/networking/stp']);
  });

  it('leaves the cycle it was given unchanged', () => {
    const cycle = startCycle(2, four, 1);
    recordLessonOpened(cycle, '/networking/vlan');
    expect(cycle.lessonsOpened).toEqual([]);
  });
});

describe('cycleReport', () => {
  const cycle = recordLessonOpened(startCycle(2, ['vlan', 'stp'], 1), '/networking/vlan');
  // before: vlan~0, stp~1, vlan~2, stp~3 — after: vlan~1000, stp~1001, vlan~1002, stp~1003
  const pre = (templateId: string, seed: number, overrides: Partial<AttemptRecord> = {}) =>
    attempt(templateId, seed, 2, { context: 'pre', cycleId: cycle.id, ...overrides });
  const post = (templateId: string, seed: number, overrides: Partial<AttemptRecord> = {}) =>
    attempt(templateId, seed, 2, { context: 'post', cycleId: cycle.id, ...overrides });
  const unsolved = { outcome: 'abandoned', firstCheckPassed: false } as const;

  const attempts = [
    pre('vlan', 0, unsolved),
    pre('stp', 1),
    pre('vlan', 2, { hintsUsed: 3 }),
    pre('stp', 3, { ...unsolved, hintsUsed: 1 }),
    post('vlan', 1000),
    post('stp', 1001),
    post('vlan', 1002, { hintsUsed: 1 }),
    post('stp', 1003, unsolved),
  ];

  it('counts solved and hints per template, before and after', () => {
    const report = cycleReport(cycle, attempts);
    expect(report.templates).toEqual([
      {
        templateId: 'vlan',
        before: { total: 2, attempted: 2, solved: 0, hintsUsed: 3 },
        after: { total: 2, attempted: 2, solved: 1, hintsUsed: 1 },
      },
      {
        templateId: 'stp',
        before: { total: 2, attempted: 2, solved: 1, hintsUsed: 1 },
        after: { total: 2, attempted: 2, solved: 1, hintsUsed: 0 },
      },
    ]);
    expect(report.before).toEqual({ total: 4, attempted: 4, solved: 1, hintsUsed: 4 });
    expect(report.after).toEqual({ total: 4, attempted: 4, solved: 2, hintsUsed: 1 });
    expect(report.afterComplete).toBe(true);
  });

  it('lists the lessons opened in between', () => {
    expect(cycleReport(cycle, attempts).lessonsOpenedBetween).toEqual(['/networking/vlan']);
  });

  it('reports a partial "after" set as not complete', () => {
    const report = cycleReport(cycle, attempts.slice(0, 5));
    expect(report.after).toEqual({ total: 4, attempted: 1, solved: 1, hintsUsed: 0 });
    expect(report.afterComplete).toBe(false);
  });

  it('counts nothing before any attempt', () => {
    const report = cycleReport(cycle, []);
    expect(report.before).toEqual({ total: 4, attempted: 0, solved: 0, hintsUsed: 0 });
    expect(report.after).toEqual({ total: 4, attempted: 0, solved: 0, hintsUsed: 0 });
    expect(report.afterComplete).toBe(false);
  });

  it('counts the latest attempt at an instance', () => {
    const report = cycleReport(cycle, [pre('vlan', 0, unsolved), pre('vlan', 0)]);
    expect(report.before).toMatchObject({ attempted: 1, solved: 1 });
  });

  it('ignores attempts from practice, from another cycle, and in the wrong set', () => {
    const report = cycleReport(cycle, [
      attempt('vlan', 0, 2),
      attempt('vlan', 0, 2, { context: 'pre', cycleId: 'cycle-2-999' }),
      attempt('vlan', 0, 2, { context: 'post', cycleId: cycle.id }),
      attempt('vlan', 1000, 2, { context: 'pre', cycleId: cycle.id }),
    ]);
    expect(report.before.attempted).toBe(0);
    expect(report.after.attempted).toBe(0);
  });

  it('keeps a template id that itself contains "~" apart from its seed', () => {
    const odd = startCycle(1, ['a~b'], 1);
    const report = cycleReport(odd, [attempt('a~b', 0, 1, { context: 'pre', cycleId: odd.id })]);
    expect(report.templates[0]?.before).toMatchObject({ total: 4, attempted: 1, solved: 1 });
  });
});
