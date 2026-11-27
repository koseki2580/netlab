/** REQ-449 — the Multipath TCP lesson's challenges, checked by the mptcp model (TC-2684). */
import { describe, expect, it } from 'vitest';
import { bottleneckShares, failover } from './mptcp';
import { mptcpChallenges, type MptcpState } from './mptcpChallenges';

const INITIAL: MptcpState = { lossAtS: 4, stripped: false, subflows: 2, coupled: false };

const challenge = (state: MptcpState, id: string) => {
  const found = mptcpChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2684: the Multipath TCP challenges are reached by the settings the model says reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(mptcpChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('break-it: stripping MP_CAPABLE breaks the download at 4 s with 20 MB; losing Wi-Fi later does not count', () => {
    const stripped: MptcpState = { ...INITIAL, stripped: true };
    const reached = challenge(stripped, 'break-it');
    expect(reached.reached).toBe(true);
    expect(failover('mptcp', 4, false).mbAtLoss).toBe(20);
    expect(reached.why.en).toContain('20 MB');
    expect(reached.why.en).toContain('40 Mbit/s');
    expect(reached.why.ja).toContain('20 MB');
    // Stripped, but Wi-Fi lost after the 10 s plain TCP needs: the download finishes.
    expect(challenge({ ...stripped, lossAtS: 10 }, 'break-it').reached).toBe(false);
    // Stripped and broken, but not at the asked 4 s.
    expect(challenge({ ...stripped, lossAtS: 3 }, 'break-it').reached).toBe(false);
  });

  it('done-before-loss: 7 s is the first whole second after the 6.67 s finish; 6 s and 8 s are not', () => {
    const reached = challenge({ ...INITIAL, lossAtS: 7 }, 'done-before-loss');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('6.67 s');
    expect(reached.why.en).toContain('45 MB');
    expect(reached.why.ja).toContain('6.67 秒');
    expect(challenge({ ...INITIAL, lossAtS: 6 }, 'done-before-loss').reached).toBe(false);
    expect(challenge({ ...INITIAL, lossAtS: 8 }, 'done-before-loss').reached).toBe(false);
    // Fallen back to TCP over Wi-Fi alone, the file is done only at 10 s.
    expect(challenge({ ...INITIAL, lossAtS: 10, stripped: true }, 'done-before-loss').reached).toBe(
      false,
    );
  });

  it('fair-four: four coupled subflows get 15 Mbit/s like the TCP flow; uncoupled or three do not count', () => {
    const state: MptcpState = { ...INITIAL, subflows: 4, coupled: true };
    const reached = challenge(state, 'fair-four');
    expect(reached.reached).toBe(true);
    expect(bottleneckShares(4, true).mptcpMbps).toBe(15);
    expect(reached.why.en).toContain('MPTCP 15 Mbit/s');
    expect(reached.why.en).toContain(`${bottleneckShares(4, false).mptcpPct} %`);
    expect(reached.why.ja).toContain('15 Mbit/s');
    expect(challenge({ ...state, coupled: false }, 'fair-four').reached).toBe(false);
    expect(challenge({ ...state, subflows: 3 }, 'fair-four').reached).toBe(false);
  });
});
