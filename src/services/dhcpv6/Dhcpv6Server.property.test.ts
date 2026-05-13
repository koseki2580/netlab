import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { Dhcpv6Client } from './Dhcpv6Client';
import { Dhcpv6Server } from './Dhcpv6Server';

describe('DHCPv6 allocation properties', () => {
  it('keeps DUID-LL allocations stable across seeds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffff }), (seed) => {
        const server = new Dhcpv6Server({
          serverDuid: 'server-1',
          pool: { start: '2001:db8:20::1', end: '2001:db8:20::ff' },
        });
        const first = new Dhcpv6Client({ macAddress: '02:00:00:00:00:0a', seed });
        const second = new Dhcpv6Client({ macAddress: '02:00:00:00:00:0a', seed: seed + 1 });

        const firstReply = server.handle(
          first.handleAdvertise(server.handle(first.buildSolicit())),
        );
        const secondReply = server.handle(
          second.handleAdvertise(server.handle(second.buildSolicit())),
        );

        expect(first.handleReply(firstReply).address).toBe(second.handleReply(secondReply).address);
      }),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });
});
