/** REQ-449 — the SD-WAN challenges, checked by the path-selection model (TC-2676). */
import { describe, expect, it } from 'vitest';
import { PERIODS, choose } from './sdwan';
import { INITIAL_SDWAN, sdwanChallenges, videoPolicy, type SdwanState } from './sdwanChallenges';

const challenge = (state: SdwanState, id: string) => {
  const found = sdwanChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2676: the SD-WAN challenges are reached by the loss limit and moment the model says reach them', () => {
  it('none is reached in the lesson right after the reveal', () => {
    expect(sdwanChallenges(INITIAL_SDWAN).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('rush-off-mpls: at 1 % video moves to LTE in the rush; 0.9 % stays on MPLS; 1.1 % is not the least', () => {
    expect(choose(videoPolicy(1), 1)).toBe('lte');
    const reached = challenge({ period: 1, videoLossPct: 1 }, 'rush-off-mpls');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('70 ms / 15 ms / 1 %');
    expect(reached.why.en).toContain('At 0.9 % it would stay on MPLS line');
    expect(reached.why.ja).toContain('0.9 % では MPLS 回線のまま');
    expect(challenge({ period: 1, videoLossPct: 0.9 }, 'rush-off-mpls').reached).toBe(false);
    expect(challenge({ period: 1, videoLossPct: 1.1 }, 'rush-off-mpls').reached).toBe(false);
    expect(challenge({ period: 2, videoLossPct: 1 }, 'rush-off-mpls').reached).toBe(false);
  });

  it('evening-off-internet: at 20:00 a 0.4 % limit sends video to MPLS; 0.5 % keeps it on the internet line', () => {
    const reached = challenge({ period: 2, videoLossPct: 0.4 }, 'evening-off-internet');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('loses 0.5 %');
    expect(reached.why.en).toContain('MPLS line (cost 3 instead of 1)');
    expect(challenge({ period: 2, videoLossPct: 0.5 }, 'evening-off-internet').reached).toBe(false);
    expect(challenge({ period: 1, videoLossPct: 0.4 }, 'evening-off-internet').reached).toBe(false);
  });

  it('one-link-all-day: at 0 % only MPLS qualifies at every moment; at 0.1 % video still moves', () => {
    const day = Array.from({ length: PERIODS }, (_, period) => choose(videoPolicy(0), period));
    expect(day).toEqual(['mpls', 'mpls', 'mpls', 'mpls']);
    const reached = challenge({ period: 1, videoLossPct: 0 }, 'one-link-all-day');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('quiet 0.1 %');
    expect(reached.why.en).toContain('only MPLS line at 0 %');
    expect(challenge({ period: 1, videoLossPct: 0.1 }, 'one-link-all-day').reached).toBe(false);
    expect(challenge({ period: 1, videoLossPct: 2 }, 'one-link-all-day').reached).toBe(false);
  });
});
