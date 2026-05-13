import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../testing/seeds';
import { applyRouterAdvertisement, buildRouterAdvertisement } from './icmpv6';

describe('ICMPv6 Router Advertisement properties', () => {
  it('maps M/O flags to one deterministic client mode', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (managed, otherConfig) => {
        const result = applyRouterAdvertisement(
          buildRouterAdvertisement({ prefix: '2001:db8:30::/64', managed, otherConfig }),
          '02:00:00:00:00:0a',
        );

        if (managed) {
          expect(result.mode).toBe('dhcpv6-address');
          expect(result.needsDhcpv6Address).toBe(true);
          return;
        }

        expect(result.needsDhcpv6Address).toBe(false);
        expect(result.mode).toBe(otherConfig ? 'slaac-with-dhcpv6-other' : 'slaac-only');
      }),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });
});
