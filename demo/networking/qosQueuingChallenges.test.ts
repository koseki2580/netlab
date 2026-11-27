/** REQ-449 — the QoS queuing challenges, checked by the token-bucket and link models (TC-2674). */
import { describe, expect, it } from 'vitest';
import { CIR_BPS, customerTraffic, police, runLink, shape } from './qosQueuing';
import { INITIAL_QOS, qosQueuingChallenges, type QosState } from './qosQueuingChallenges';

const challenge = (state: QosState, id: string) => {
  const found = qosQueuingChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};
const traffic = customerTraffic();

describe('TC-2674: the QoS queuing challenges are reached by the settings the models say reach them', () => {
  it('none is reached in the lesson as it opens', () => {
    expect(qosQueuingChallenges(INITIAL_QOS).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('policer-no-drop: 1010 kbit drops nothing, 1000 kbit drops 5; 1020 kbit is not the smallest', () => {
    expect(police(traffic, CIR_BPS, 1_010_000).droppedPackets).toBe(0);
    const reached = challenge({ ...INITIAL_QOS, depthKbit: 1010 }, 'policer-no-drop');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('At 1010 kbit the policer drops 0 of 625 packets');
    expect(reached.why.en).toContain('at 1000 kbit it drops 5');
    expect(reached.why.ja).toContain('1000 kbit では 5 個');
    expect(challenge({ ...INITIAL_QOS, depthKbit: 1000 }, 'policer-no-drop').reached).toBe(false);
    expect(challenge({ ...INITIAL_QOS, depthKbit: 1020 }, 'policer-no-drop').reached).toBe(false);
  });

  it('rogue-contained: LLQ holds EF to 2 Mbit/s so bulk keeps 8.0 Mbit/s; unpoliced priority and FIFO do not', () => {
    const state: QosState = { ...INITIAL_QOS, scheduler: 'llq', rogueEf: true };
    const reached = challenge(state, 'rogue-contained');
    expect(reached.reached).toBe(true);
    const link = runLink({ scheduler: 'llq', rogueEf: true });
    expect(reached.why.en).toContain(
      `${Math.round(link.bulk.mbpsDuringTransfer * 10) / 10} Mbit/s`,
    );
    expect(reached.why.en).toContain('8 Mbit/s');
    expect(reached.why.en).toContain(`${link.voice.lossPct} %`);
    expect(
      challenge({ ...state, scheduler: 'priority-unpoliced' }, 'rogue-contained').reached,
    ).toBe(false);
    expect(challenge({ ...state, scheduler: 'fifo' }, 'rogue-contained').reached).toBe(false);
    // Without the wrong marking the goal is not the one asked.
    expect(challenge({ ...state, rogueEf: false }, 'rogue-contained').reached).toBe(false);
  });

  it('shaper-delay: 880 kbit holds at most 24.8 ms, 870 kbit 26.8 ms; 890 kbit is not the smallest', () => {
    expect(shape(traffic, CIR_BPS, 880_000).maxDelayUs).toBe(24_800);
    const reached = challenge({ ...INITIAL_QOS, depthKbit: 880 }, 'shaper-delay');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('the longest hold is 24.8 ms');
    expect(reached.why.en).toContain('at 870 kbit it is 26.8 ms');
    expect(reached.why.en).toContain('125 kbit');
    expect(challenge({ ...INITIAL_QOS, depthKbit: 870 }, 'shaper-delay').reached).toBe(false);
    expect(challenge({ ...INITIAL_QOS, depthKbit: 890 }, 'shaper-delay').reached).toBe(false);
  });
});
