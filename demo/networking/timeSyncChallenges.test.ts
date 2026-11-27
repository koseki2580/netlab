/** REQ-449 — the time-sync lesson's challenges (TC-2638). */
import { describe, expect, it } from 'vitest';
import { timeSyncChallenges, type TimeSyncChallengeState } from './timeSyncChallenges';

/** The lesson's settings when its sliders first appear: 14 ms out, Sync waits 400 µs. */
const INITIAL: TimeSyncChallengeState = { forward: 14, syncWaitUs: 400 };

const challenge = (state: TimeSyncChallengeState, id: string) => {
  const found = timeSyncChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2638: the time-sync challenges are reached only by settings the model says reach them', () => {
  it('no challenge is reached in the lesson’s initial settings', () => {
    expect(timeSyncChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('exact: 4 ms out matches the 4 ms back, so NTP computes +25 ms', () => {
    const reaching = { ...INITIAL, forward: 4 };
    expect(challenge(reaching, 'exact').reached).toBe(true);
    expect(challenge(reaching, 'exact').why.en).toContain('+25 ms');
    expect(challenge(reaching, 'exact').why.ja).toContain('+25 ms');
    // 6 ms out leaves 1 ms of error.
    expect(challenge({ ...INITIAL, forward: 6 }, 'exact').reached).toBe(false);
  });

  it('worst-case: 0 ms out puts the error −2 ms at the bound ±2 ms', () => {
    const reaching = { ...INITIAL, forward: 0 };
    expect(challenge(reaching, 'worst-case').reached).toBe(true);
    expect(challenge(reaching, 'worst-case').why.en).toContain('−2 ms');
    expect(challenge(reaching, 'worst-case').why.en).toContain('±2 ms');
    // 2 ms out: error −1 ms, bound ±3 ms.
    expect(challenge({ ...INITIAL, forward: 2 }, 'worst-case').reached).toBe(false);
  });

  it('ordinary-switch: a 20 µs Sync wait leaves the slave −50 ns off', () => {
    const reaching = { ...INITIAL, syncWaitUs: 20 };
    expect(challenge(reaching, 'ordinary-switch').reached).toBe(true);
    expect(challenge(reaching, 'ordinary-switch').why.en).toContain('−50 ns');
    expect(challenge(reaching, 'ordinary-switch').why.ja).toContain('−50 ns');
    // 40 µs: the slave is 9,950 ns off.
    expect(challenge({ ...INITIAL, syncWaitUs: 40 }, 'ordinary-switch').reached).toBe(false);
    expect(challenge({ ...INITIAL, syncWaitUs: 0 }, 'ordinary-switch').reached).toBe(false);
  });
});
