/** REQ-449 — the Q-in-Q lesson's challenges, checked by the frame and forwarding model (TC-2654). */
import { describe, expect, it } from 'vitest';
import { qinqChallenges, type QinqChallengeState } from './qinqChallenges';

/** The lesson's controls as the page starts. */
const INITIAL: QinqChallengeState = { payload: 1500, coreLimit: 1526, customer: 'A', mode: 'qinq' };

const challenge = (state: QinqChallengeState, id: string) => {
  const found = qinqChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2654: the Q-in-Q challenges are reached by the settings the model says reach them', () => {
  it('none is reached as the lesson starts', () => {
    expect(qinqChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false]);
  });

  it('fill-core: 1496 bytes fill a 1522-byte core; 1500 does not fit and 1492 is not the largest', () => {
    const reaching = { ...INITIAL, payload: 1496, coreLimit: 1522 };
    const reached = challenge(reaching, 'fill-core');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('1522 bytes');
    expect(reached.why.en).toContain('1526 bytes');
    expect(reached.why.ja).toContain('1522 バイト');
    expect(challenge({ ...reaching, payload: 1500 }, 'fill-core').reached).toBe(false);
    expect(challenge({ ...reaching, payload: 1492 }, 'fill-core').reached).toBe(false);
    // On the 1526-byte core 1496 bytes is not the largest that fits.
    expect(challenge({ ...reaching, coreLimit: 1526 }, 'fill-core').reached).toBe(false);
  });

  it('leak: B1 on one shared VLAN reaches A2; B1 under Q-in-Q or A1 on the shared VLAN does not count', () => {
    const reaching: QinqChallengeState = { ...INITIAL, customer: 'B', mode: 'shared-vlan' };
    const reached = challenge(reaching, 'leak');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('C-VLAN 10');
    expect(reached.why.en).toContain('A2 and B2');
    expect(reached.why.ja).toContain('A2 と B2');
    expect(challenge({ ...reaching, mode: 'qinq' }, 'leak').reached).toBe(false);
    expect(challenge({ ...reaching, customer: 'A' }, 'leak').reached).toBe(false);
  });

  it('a remembered challenge keeps its explanation after the controls move on', () => {
    expect(challenge(INITIAL, 'fill-core').why.en).toContain('1496 bytes of payload');
  });
});
