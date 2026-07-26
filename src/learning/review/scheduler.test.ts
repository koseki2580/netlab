import { describe, expect, it } from 'vitest';
import {
  BOX_INTERVAL_MS,
  MAX_BOX,
  gradeReview,
  isDue,
  isMastered,
  reviewQueue,
  reviewStats,
  type ReviewState,
} from './scheduler';

const T0 = 1_700_000_000_000;

describe('spaced-repetition scheduler', () => {
  it('a correct answer promotes the box and pushes the due date out', () => {
    const s1 = gradeReview({}, 'arp:q1', true, T0);
    expect(s1['arp:q1']?.box).toBe(1);
    expect(s1['arp:q1']?.dueAt).toBe(T0 + BOX_INTERVAL_MS[1]!);

    const s2 = gradeReview(s1, 'arp:q1', true, T0);
    expect(s2['arp:q1']?.box).toBe(2);
    expect(s2['arp:q1']?.dueAt).toBe(T0 + BOX_INTERVAL_MS[2]!);
    expect(BOX_INTERVAL_MS[2]!).toBeGreaterThan(BOX_INTERVAL_MS[1]!);
  });

  it('a wrong answer resets the item to box 1', () => {
    let s: ReviewState = {};
    for (let i = 0; i < 4; i += 1) s = gradeReview(s, 'tcp:q1', true, T0); // climb to box 4
    expect(s['tcp:q1']?.box).toBe(4);
    s = gradeReview(s, 'tcp:q1', false, T0);
    expect(s['tcp:q1']?.box).toBe(1);
  });

  it('caps promotion at the top box (mastered)', () => {
    let s: ReviewState = {};
    for (let i = 0; i < 10; i += 1) s = gradeReview(s, 'dns:q1', true, T0);
    expect(s['dns:q1']?.box).toBe(MAX_BOX);
    expect(isMastered(s, 'dns:q1')).toBe(true);
  });

  it('isDue is true only once the scheduled time has passed', () => {
    const s = gradeReview({}, 'ip:q1', true, T0); // due at T0 + 10min
    expect(isDue(s, 'ip:q1', T0)).toBe(false);
    expect(isDue(s, 'ip:q1', T0 + BOX_INTERVAL_MS[1]!)).toBe(true);
    expect(isDue(s, 'unseen:q1', T0)).toBe(false);
  });

  it('reviewQueue surfaces weakest-and-most-overdue first and excludes mastered', () => {
    let s: ReviewState = {};
    s = gradeReview(s, 'weak', false, T0); // box 1
    s = gradeReview(s, 'mid', true, T0); // box 1
    s = gradeReview(s, 'mid', true, T0); // box 2
    for (let i = 0; i < 6; i += 1) s = gradeReview(s, 'done', true, T0); // mastered

    const queue = reviewQueue(s);
    expect(queue).toContain('weak');
    expect(queue).toContain('mid');
    expect(queue).not.toContain('done'); // mastered drops out
    expect(queue.indexOf('weak')).toBeLessThan(queue.indexOf('mid')); // lower box first
  });

  it('front-loads genuinely due items so a fresh backlog cannot starve them', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    // Without a clock, a pile of just-missed box-1 items (not due for 10 minutes)
    // fills every capped session and overdue box-2 items never surface again.
    let s: ReviewState = {};
    s = gradeReview(s, 'overdue', true, T0); // box 2, due T0 + 1d
    s = gradeReview(s, 'overdue', true, T0);
    for (let i = 0; i < 12; i += 1) s = gradeReview(s, `fresh${i}`, false, T0); // box 1

    // 'overdue' (box 2, +1d) is due; the box-1 backlog (+10m) was graded later so
    // it is NOT yet due — exactly the shape that used to bury the due item.
    const notYetDue = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`fresh${i}`, { box: 1, dueAt: T0 + 2 * DAY_MS }]),
    );
    s = { ...s, ...notYetDue };
    const now = T0 + 1 * DAY_MS;
    expect(s.overdue!.dueAt).toBeLessThanOrEqual(now);
    expect(s.fresh0!.dueAt).toBeGreaterThan(now);
    const queue = reviewQueue(s, 10, now);
    expect(queue).toContain('overdue');
    expect(queue[0]).toBe('overdue');
    // Without `now` the same call buries it behind the lower-box backlog.
    expect(reviewQueue(s, 10)).not.toContain('overdue');
  });

  it('respects the queue limit', () => {
    let s: ReviewState = {};
    for (const id of ['a', 'b', 'c', 'd']) s = gradeReview(s, id, false, T0);
    expect(reviewQueue(s, 2)).toHaveLength(2);
  });

  it('reports stats: seen, mastered, due, inReview', () => {
    let s: ReviewState = {};
    s = gradeReview(s, 'a', false, T0); // box1
    for (let i = 0; i < 6; i += 1) s = gradeReview(s, 'b', true, T0); // mastered
    const stats = reviewStats(s, T0 + 30 * DAY());
    expect(stats.seen).toBe(2);
    expect(stats.mastered).toBe(1);
    expect(stats.inReview).toBe(1);
    expect(stats.due).toBe(2); // both scheduled in the past relative to now
    expect(stats.dueInReview).toBe(1); // only the non-mastered one is actionable
  });

  it('dueInReview excludes not-yet-due items right after a session', () => {
    let s: ReviewState = {};
    s = gradeReview(s, 'a', false, T0); // box 1, due in 10 min
    const stats = reviewStats(s, T0); // checked immediately
    expect(stats.inReview).toBe(1);
    expect(stats.dueInReview).toBe(0); // not due yet — no false "review now" signal
  });
});

function DAY() {
  return 86_400_000;
}
