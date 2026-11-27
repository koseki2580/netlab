/** REQ-449 — the IPv6 addressing lesson's challenges (TC-2650). */
import { describe, expect, it } from 'vitest';
import { DELEGATED, lanPrefix, subnetCount } from './ipv6Addressing';
import {
  ipv6AddressingChallenges,
  type Ipv6AddressingChallengeState,
} from './ipv6AddressingChallenges';

const SLASH_48 = '2001:db8:1234::/48';
const SLASH_60 = '2001:db8:1234:5670::/60';

/** The lesson's state when the challenges first appear: the /56, LAN 4. */
const INITIAL: Ipv6AddressingChallengeState = { delegated: DELEGATED, lan: 4 };

const challenge = (state: Ipv6AddressingChallengeState, id: string) =>
  ipv6AddressingChallenges(state).find((c) => c.id === id)!;

describe('TC-2650: the IPv6 addressing challenges are reached only by settings the model confirms', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(ipv6AddressingChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false]);
  });

  it('subnet-10: LAN 17 of the /56 (subnet ID 16 = 0x10) gets …:5610::/64; LAN 10 and 11 do not', () => {
    const at = (lan: number) => challenge({ delegated: DELEGATED, lan }, 'subnet-10');
    expect(at(17).reached).toBe(true);
    expect(at(10).reached).toBe(false);
    expect(at(11).reached).toBe(false);
    expect(at(17).why.en).toContain('subnet ID 17 − 1 = 16, which is 10 in hex');
    expect(at(17).why.ja).toContain(lanPrefix(DELEGATED, 17)!);
  });

  it('subnet-10: on the /48 the same /64 is LAN 0x5611, the subnet ID 5610', () => {
    expect(challenge({ delegated: SLASH_48, lan: 0x5611 }, 'subnet-10').reached).toBe(true);
  });

  it('smallest-for-12: the /60 (16 LANs) with LAN 12; the /56 with LAN 12, or the /60 with LAN 11, is not', () => {
    expect(challenge({ delegated: SLASH_60, lan: 12 }, 'smallest-for-12').reached).toBe(true);
    expect(challenge({ delegated: DELEGATED, lan: 12 }, 'smallest-for-12').reached).toBe(false);
    expect(challenge({ delegated: SLASH_60, lan: 11 }, 'smallest-for-12').reached).toBe(false);
    const why = challenge({ delegated: SLASH_60, lan: 12 }, 'smallest-for-12').why;
    expect(why.en).toContain(`room for ${subnetCount(60, 64)} LANs`);
    expect(why.en).toContain(`hold only ${subnetCount(61, 64)}`);
    expect(why.ja).toContain(lanPrefix(SLASH_60, 12)!);
  });
});
