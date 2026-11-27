/** REQ-449 — The DHCP lease lesson's challenges, checked by its model (TC-2644). */
import { describe, expect, it } from 'vitest';
import { simulateLease } from './dhcpLease';
import { dhcpLeaseChallenges, type DhcpLeaseChallengeState } from './dhcpLeaseChallenges';

const H = 3600;

/** The lesson's controls when the lab first appears. */
const INITIAL: DhcpLeaseChallengeState = { leaseH: 8, downH: 1, serverB: false };

const challenge = (state: Partial<DhcpLeaseChallengeState>, id: string) =>
  dhcpLeaseChallenges({ ...INITIAL, ...state }).find((c) => c.id === id)!;

describe('TC-2644: the DHCP lease challenges are reached only by settings the model says reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(dhcpLeaseChallenges(INITIAL).map((c) => [c.id, c.reached])).toEqual([
      ['survive-outage', false],
      ['notice-soon', false],
      ['quick-takeover', false],
    ]);
  });

  it('a 24 h lease keeps the address 23 h after A dies at 1 h; 20 h keeps it only 19 h', () => {
    const reached = challenge({ leaseH: 24 }, 'survive-outage');
    expect(reached.reached).toBe(true);
    expect(simulateLease({ leaseS: 24 * H, serverDownS: H, serverB: false }).addressLostS).toBe(
      24 * H,
    );
    expect(reached.why.en).toContain('works for 23 h');
    expect(reached.why.ja).toContain('23 時間使えます');
    expect(challenge({ leaseH: 20 }, 'survive-outage').reached).toBe(false);
    // Server B keeps the address, but the goal is to survive with A alone.
    expect(challenge({ leaseH: 24, serverB: true }, 'survive-outage').reached).toBe(false);
  });

  it('with the 8 h lease, A dying at 3.5 h is noticed at the 4 h renew; dying at 3 h is noticed 1 h later', () => {
    const reached = challenge({ downH: 3.5 }, 'notice-soon');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('unanswered at 4 h: 30 minutes later');
    expect(challenge({ downH: 3 }, 'notice-soon').reached).toBe(false);
    // Changing the lease breaks the stated limit.
    expect(challenge({ leaseH: 7, downH: 3 }, 'notice-soon').reached).toBe(false);
  });

  it('with B, a 2 h lease and A dying at T1 (1 h), B answers the 1.75 h rebind; a 4 h lease with A dying at 1.5 h waits 2 h', () => {
    const reached = challenge({ leaseH: 2, downH: 1, serverB: true }, 'quick-takeover');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('B answers at 1.75 h, 0.75 h after A died');
    expect(challenge({ leaseH: 4, downH: 1.5, serverB: true }, 'quick-takeover').reached).toBe(
      false,
    );
    expect(challenge({ serverB: true }, 'quick-takeover').reached).toBe(false);
  });
});
