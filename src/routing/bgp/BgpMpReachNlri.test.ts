import { describe, expect, it } from 'vitest';
import { decodeMpReachNlri, encodeMpReachNlri } from './BgpMpReachNlri';

describe('MP_REACH_NLRI IPv6 codec', () => {
  it('round-trips AFI=2 SAFI=1 IPv6 unicast reachability', () => {
    const value = {
      afi: 2 as const,
      safi: 1 as const,
      nextHop: '2001:db8::1',
      nlri: [{ length: 64, prefix: '2001:db8:100::' }],
    };

    expect(decodeMpReachNlri(encodeMpReachNlri(value))).toEqual(value);
  });
});
