/** REQ-366 — VLSM practice: the rules, and problems that can be solved (TC-1740..TC-1742). */
import { describe, expect, it } from 'vitest';
import {
  checkPlan,
  generateVlsm,
  largestFirstPlan,
  smallestPrefixFor,
  type VlsmProblem,
} from './vlsm';

const PROBLEM: VlsmProblem = {
  block: { network: '192.168.10.0', prefix: 24 },
  departments: [
    { name: { en: 'Sales', ja: '営業' }, hosts: 50 },
    { name: { en: 'Office', ja: '事務' }, hosts: 10 },
    { name: { en: 'Router link', ja: 'ルータ間リンク' }, hosts: 2 },
  ],
};

describe('TC-1740: each subnet is checked against the five rules', () => {
  it('passes a plan that fits, wastes nothing, stays in the block, is aligned and does not overlap', () => {
    const results = checkPlan(PROBLEM, [
      { network: '192.168.10.0', prefix: 26 },
      { network: '192.168.10.64', prefix: 28 },
      { network: '192.168.10.80', prefix: 30 },
    ]);
    expect(results.every((row) => row.ok)).toBe(true);
  });

  it('names what each wrong subnet breaks', () => {
    const [small, wasteful, misaligned] = checkPlan(PROBLEM, [
      { network: '192.168.10.0', prefix: 27 }, // 30 hosts < 50
      { network: '192.168.10.64', prefix: 26 }, // 62 hosts for 10: /28 is enough
      { network: '192.168.10.130', prefix: 30 }, // .130 is not a /30 boundary
    ]);
    expect(small?.problems).toEqual(['too-small']);
    expect(wasteful?.problems).toEqual(['wasteful']);
    expect(misaligned?.problems).toEqual(['not-a-network']);
  });

  it('finds a subnet outside the block, overlaps, and unreadable input', () => {
    const results = checkPlan(PROBLEM, [
      { network: '192.168.10.0', prefix: 26 },
      { network: '192.168.10.48', prefix: 28 }, // inside the first /26
      { network: '192.168.11.0', prefix: 30 },
    ]);
    expect(results[1]?.problems).toEqual(['overlaps']);
    expect(results[1]?.overlapsWith).toEqual([0]);
    expect(results[0]?.problems).toEqual(['overlaps']);
    expect(results[2]?.problems).toEqual(['outside-block']);
    expect(
      checkPlan(PROBLEM, [
        null,
        { network: '10.0.0', prefix: 28 },
        { network: '192.168.10.80', prefix: 33 },
      ]).map((r) => r.problems),
    ).toEqual([['unreadable'], ['unreadable'], ['unreadable']]);
  });

  it('knows the smallest prefix for a number of hosts', () => {
    expect([2, 6, 10, 14, 30, 50, 62, 100, 126].map(smallestPrefixFor)).toEqual([
      30, 29, 28, 28, 27, 26, 26, 25, 25,
    ]);
  });
});

describe('TC-1741: every problem can be solved, and a seed shows the same problem again', () => {
  it('a largest-first plan passes for 300 seeds', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const problem = generateVlsm(seed);
      expect(problem.departments.length).toBeGreaterThanOrEqual(4);
      expect(
        checkPlan(problem, largestFirstPlan(problem)).every((row) => row.ok),
        `seed ${seed}`,
      ).toBe(true);
    }
    expect(generateVlsm(42)).toEqual(generateVlsm(42));
  });
});

describe('TC-1742: a valid plan other than largest-first also passes', () => {
  it('accepts the small subnets placed first', () => {
    const results = checkPlan(PROBLEM, [
      { network: '192.168.10.64', prefix: 26 },
      { network: '192.168.10.16', prefix: 28 },
      { network: '192.168.10.0', prefix: 30 },
    ]);
    expect(results.every((row) => row.ok)).toBe(true);
  });
});
