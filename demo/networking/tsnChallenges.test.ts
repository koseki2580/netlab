/** REQ-449 — the TSN lesson's challenges, checked by the delay model (TC-2658). */
import { describe, expect, it } from 'vitest';
import { tsnChallenges, type TsnChallengeState } from './tsnChallenges';

/** The comparison card's controls as it opens. */
const INITIAL: TsnChallengeState = { rate: 1000, hops: 1 };

const challenge = (state: TsnChallengeState, id: string) => {
  const found = tsnChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2658: the TSN challenges are reached by the rate and path the model says reach them', () => {
  it('none is reached as the comparison opens', () => {
    expect(tsnChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('priority-hops: 3 switches at 1 Gb/s take 38.928 µs; 4 take 51.904 µs; 2 are not the most', () => {
    const reached = challenge({ rate: 1000, hops: 3 }, 'priority-hops');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('38.928 µs');
    expect(reached.why.en).toContain('51.904 µs');
    expect(reached.why.ja).toContain('12.976 µs');
    expect(challenge({ rate: 1000, hops: 4 }, 'priority-hops').reached).toBe(false);
    expect(challenge({ rate: 1000, hops: 2 }, 'priority-hops').reached).toBe(false);
    expect(challenge({ rate: 10_000, hops: 3 }, 'priority-hops').reached).toBe(false);
  });

  it('fast-link: 8 switches at 10 Gb/s take 10.381 µs; at 1 Gb/s or over 7 switches it does not count', () => {
    const reached = challenge({ rate: 10_000, hops: 8 }, 'fast-link');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('10.381 µs');
    expect(reached.why.en).toContain('103.808 µs');
    expect(challenge({ rate: 1000, hops: 8 }, 'fast-link').reached).toBe(false);
    expect(challenge({ rate: 10_000, hops: 7 }, 'fast-link').reached).toBe(false);
  });

  it('qbv-hops: 7 switches at 100 Mb/s take 47.04 µs; 8 take 53.76 µs; 6 are not the most', () => {
    const reached = challenge({ rate: 100, hops: 7 }, 'qbv-hops');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('47.04 µs');
    expect(reached.why.en).toContain('53.76 µs');
    expect(reached.why.en).toContain('129.76 µs');
    expect(challenge({ rate: 100, hops: 8 }, 'qbv-hops').reached).toBe(false);
    expect(challenge({ rate: 100, hops: 6 }, 'qbv-hops').reached).toBe(false);
    expect(challenge({ rate: 1000, hops: 7 }, 'qbv-hops').reached).toBe(false);
  });

  it('a remembered challenge keeps its explanation after the controls move on', () => {
    expect(challenge(INITIAL, 'qbv-hops').why.en).toContain('47.04 µs');
  });
});
