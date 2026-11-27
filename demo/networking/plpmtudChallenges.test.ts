/** REQ-449 — the PLPMTUD lesson's challenges, checked by the probe search (TC-2634). */
import { describe, expect, it } from 'vitest';
import { ASKED_PATH_MTU, search } from './plpmtud';
import { plpmtudChallenges } from './plpmtudChallenges';

const challenge = (pathMtu: number, id: string) => {
  const found = plpmtudChallenges(pathMtu).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2634: the PLPMTUD challenges are reached by the path MTU the search says reaches them', () => {
  it('none is reached on the asked 1400-byte path', () => {
    expect(plpmtudChallenges(ASKED_PATH_MTU).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('exact: a 1492-byte path settles on exactly 1444; 1448 falls 4 short; 1500 does not count', () => {
    const reached = challenge(1492, 'exact');
    expect(reached.reached).toBe(true);
    expect(search(1492).plpmtu).toBe(1444);
    expect(reached.why.en).toContain('fits 1444 bytes (1492 − 48)');
    expect(reached.why.ja).toContain('1444');
    expect(challenge(1496, 'exact').reached).toBe(false);
    expect(challenge(1500, 'exact').reached).toBe(false);
  });

  it('costliest: a 1376-byte path loses 5 sizes, 5 × 3 + 1 = 16 packets; 1384 spends 14', () => {
    const reached = challenge(1376, 'costliest');
    expect(reached.reached).toBe(true);
    expect(reached.goal.en).toContain('16');
    expect(reached.why.en).toContain('5 × 3 + 1 = 16 packets');
    expect(search(1384).datagrams).toBe(14);
    expect(challenge(1384, 'costliest').reached).toBe(false);
  });

  it('widest-gap: a 1388-byte path settles 7 bytes short; 1384 is only 3 short', () => {
    const reached = challenge(1388, 'widest-gap');
    expect(reached.reached).toBe(true);
    expect(search(1388)).toMatchObject({ plpmtu: 1333, largestFitting: 1340 });
    expect(reached.why.en).toContain('settles at 1333 bytes while 1340 would fit: 7 bytes short');
    expect(challenge(1384, 'widest-gap').reached).toBe(false);
  });
});
