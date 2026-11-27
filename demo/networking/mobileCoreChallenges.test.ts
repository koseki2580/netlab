/** REQ-449 — the 5G mobile-core lesson's challenges (TC-2652). */
import { describe, expect, it } from 'vitest';
import { innerSizes } from './mobileCore';
import { mobileCoreChallenges, type MobileCoreChallengeState } from './mobileCoreChallenges';

/** The lesson's state when the challenges first appear. */
const INITIAL: MobileCoreChallengeState = { outer: 'ipv4', container: true, transportMtu: 1500 };

const challenge = (state: Partial<MobileCoreChallengeState>, id: string) =>
  mobileCoreChallenges({ ...INITIAL, ...state }).find((c) => c.id === id)!;

describe('TC-2652: the mobile-core challenges are reached only by settings the model confirms', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(mobileCoreChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false]);
  });

  it('ue-keeps-1500: IPv4 at 1544 with the container; 1540, 1548, IPv6 at 1564 or no container are not', () => {
    expect(challenge({ transportMtu: 1544 }, 'ue-keeps-1500').reached).toBe(true);
    expect(challenge({ transportMtu: 1540 }, 'ue-keeps-1500').reached).toBe(false);
    expect(challenge({ transportMtu: 1548 }, 'ue-keeps-1500').reached).toBe(false);
    expect(challenge({ outer: 'ipv6', transportMtu: 1564 }, 'ue-keeps-1500').reached).toBe(false);
    expect(challenge({ container: false, transportMtu: 1536 }, 'ue-keeps-1500').reached).toBe(
      false,
    );
    const why = challenge({ transportMtu: 1544 }, 'ue-keeps-1500').why;
    expect(why.en).toContain(`1544 − ${innerSizes(1544, 'ipv4', true).overhead.total}`);
    expect(why.ja).toContain('1564');
  });

  it('ipv6-same-mtu: IPv6 at 1520 gives 1456 again; 1516, or IPv4 at 1520, is not', () => {
    expect(challenge({ outer: 'ipv6', transportMtu: 1520 }, 'ipv6-same-mtu').reached).toBe(true);
    expect(challenge({ outer: 'ipv6', transportMtu: 1516 }, 'ipv6-same-mtu').reached).toBe(false);
    expect(challenge({ transportMtu: 1500 }, 'ipv6-same-mtu').reached).toBe(false);
    const why = challenge({ outer: 'ipv6', transportMtu: 1520 }, 'ipv6-same-mtu').why;
    expect(why.en).toContain(`1520 − 64 = ${innerSizes(1520, 'ipv6', true).innerMtu}`);
    expect(why.ja).toContain(`MSS もまた ${innerSizes(1520, 'ipv6', true).tcpMss}`);
  });
});
