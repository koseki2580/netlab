/**
 * @property-seed 0x5a4b12 routing longest-prefix property.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bestRoute } from '../pipeline/dispatch/routingHelpers';
import type { RouteEntry } from '../../types/routing';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { cidrArb, ipv4Arb } from '../../testing/properties/arbitraries';
import { routeDecisionIsLongestPrefix } from '../../testing/properties/oracles';

function entry(destination: string, index: number): RouteEntry {
  return {
    destination,
    nextHop: 'direct',
    metric: index + 1,
    protocol: 'static',
    adminDistance: 1,
    nodeId: 'router-1',
  };
}

describe('routing properties', () => {
  it('selects a longest-prefix matching route when a route matches', () => {
    fc.assert(
      fc.property(fc.array(cidrArb(), { minLength: 1, maxLength: 12 }), ipv4Arb(), (cidrs, dst) => {
        const routes = cidrs.map(entry);
        const chosen = bestRoute(dst, routes);
        if (!chosen) {
          return;
        }
        expect(() => routeDecisionIsLongestPrefix(routes, dst, chosen)).not.toThrow();
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
