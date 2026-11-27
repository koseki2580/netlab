/** REQ-449 — the CUBIC and RACK-TLP lesson's challenges (TC-2640). */
import { describe, expect, it } from 'vitest';
import { tcpCubicChallenges, type TcpCubicChallengeState } from './tcpCubicChallenges';

/** The lesson's settings when its controls first appear: 10 Gb/s, 100 ms; SRTT 50 ms, 2 lost. */
const INITIAL: TcpCubicChallengeState = { bps: 10e9, rttMs: 100, srttMs: 50, lost: 2 };

const challenge = (state: TcpCubicChallengeState, id: string) => {
  const found = tcpCubicChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2640: the CUBIC and RACK-TLP challenges are reached only by settings the model says reach them', () => {
  it('no challenge is reached in the lesson’s initial settings', () => {
    expect(tcpCubicChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('reno-first: at 100 Mb/s and 30 ms Reno is back in 3.8 s, CUBIC in 4.2 s', () => {
    const reaching = { ...INITIAL, bps: 100e6, rttMs: 30 };
    expect(challenge(reaching, 'reno-first').reached).toBe(true);
    expect(challenge(reaching, 'reno-first').why.en).toContain('3.8 s');
    expect(challenge(reaching, 'reno-first').why.en).toContain('4.2 s');
    expect(challenge(reaching, 'reno-first').why.ja).toContain('3.8 秒');
    // 40 ms: Reno 6.7 s, CUBIC 6.3 s.
    expect(challenge({ ...INITIAL, bps: 100e6, rttMs: 40 }, 'reno-first').reached).toBe(false);
  });

  it('reno-minute: at 10 Gb/s, a 10 ms round trip gives Reno 41.7 s', () => {
    const reaching = { ...INITIAL, rttMs: 10 };
    expect(challenge(reaching, 'reno-minute').reached).toBe(true);
    expect(challenge(reaching, 'reno-minute').why.en).toContain('41.7 s');
    expect(challenge(reaching, 'reno-minute').why.ja).toContain('41.7 秒');
    // 20 ms: 166.7 s.
    expect(challenge({ ...INITIAL, rttMs: 20 }, 'reno-minute').reached).toBe(false);
    // A slower path is not the limit the goal sets.
    expect(challenge({ ...INITIAL, bps: 1e9, rttMs: 30 }, 'reno-minute').reached).toBe(false);
  });

  it('no-head-start: one segment lost at SRTT 400 ms makes the PTO 1,000 ms, the RTO', () => {
    const reaching = { ...INITIAL, srttMs: 400, lost: 1 };
    expect(challenge(reaching, 'no-head-start').reached).toBe(true);
    expect(challenge(reaching, 'no-head-start').why.en).toContain('1000 ms');
    expect(challenge(reaching, 'no-head-start').why.en).toContain('1400 ms');
    // 390 ms: the probe fires at 1,370 ms, the timeout at 1,390 ms.
    expect(challenge({ ...INITIAL, srttMs: 390, lost: 1 }, 'no-head-start').reached).toBe(false);
    // Two lost at 500 ms also fire together, but break the SRTT limit.
    expect(challenge({ ...INITIAL, srttMs: 500, lost: 2 }, 'no-head-start').reached).toBe(false);
  });
});
