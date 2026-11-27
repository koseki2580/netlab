/** REQ-449 — the TCP options lesson's challenges, checked by the tcpOptions model (TC-2686). */
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOST, FAR_RTT_MS } from './tcpOptions';
import { tcpOptionsChallenges, type TcpOptionsState } from './tcpOptionsChallenges';

const INITIAL: TcpOptionsState = { rttMs: FAR_RTT_MS, stripped: false, lost: DEFAULT_LOST };

const challenge = (state: TcpOptionsState, id: string) => {
  const found = tcpOptionsChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2686: the TCP options challenges are reached by the settings the model says reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(tcpOptionsChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('stripped-longest: stripped at 50 ms gives 10.5 Mbit/s; 55 ms falls to 9.5; 45 ms is not the longest', () => {
    const state: TcpOptionsState = { ...INITIAL, stripped: true, rttMs: 50 };
    const reached = challenge(state, 'stripped-longest');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('10.5 Mbit/s');
    expect(reached.why.en).toContain('9.5 Mbit/s');
    expect(reached.why.ja).toContain('10.5 Mbit/s');
    expect(challenge({ ...state, rttMs: 55 }, 'stripped-longest').reached).toBe(false);
    expect(challenge({ ...state, rttMs: 45 }, 'stripped-longest').reached).toBe(false);
    // Not stripped: scaling fills the link, the goal is about the stripped path.
    expect(challenge({ ...state, stripped: false }, 'stripped-longest').reached).toBe(false);
  });

  it('shift-ten: 270 ms needs 33.75 MB, over shift 9; 265 ms fits shift 9; 275 ms is not the shortest', () => {
    const state: TcpOptionsState = { ...INITIAL, rttMs: 270 };
    const reached = challenge(state, 'shift-ten');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('33.75 MB');
    expect(reached.why.en).toContain('33,553,920 bytes');
    expect(reached.why.en).toContain('shift 9 is enough');
    expect(reached.why.ja).toContain('33.75 MB');
    expect(challenge({ ...state, rttMs: 265 }, 'shift-ten').reached).toBe(false);
    expect(challenge({ ...state, rttMs: 275 }, 'shift-ten').reached).toBe(false);
    expect(challenge({ ...state, stripped: true }, 'shift-ten').reached).toBe(false);
  });

  it('too-many-blocks: five separate losses need five blocks; adjacent losses or a sixth loss do not count', () => {
    const state: TcpOptionsState = { ...INITIAL, lost: [5, 9, 14, 3, 11] };
    const reached = challenge(state, 'too-many-blocks');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('holds 5 separate blocks');
    expect(reached.why.en).toContain('34 bytes');
    expect(reached.why.en).toContain('ACK says 3');
    expect(reached.why.ja).toContain('5 個');
    // Five losses, two of them next to each other: only four blocks.
    expect(challenge({ ...state, lost: [5, 6, 9, 14, 16] }, 'too-many-blocks').reached).toBe(false);
    // Six separate losses: too many blocks, but not the fewest losses.
    expect(challenge({ ...state, lost: [1, 3, 5, 9, 11, 14] }, 'too-many-blocks').reached).toBe(
      false,
    );
  });
});
