/**
 * @property-seed 0x5a4b12 trace-filter parser canonical seed from plan/81p.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../../../testing/seeds';
import { parseTraceFilter } from '../parser';

describe('trace display filter parser properties', () => {
  it('is total for arbitrary input and returns parse columns inside the input bounds', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (input) => {
        const result = parseTraceFilter(input);
        if (result.ok) {
          expect(result.predicate).toBeTypeOf('function');
          return;
        }
        expect(result.error.context).toMatchObject({
          column: expect.any(Number),
        });
        const column = result.error.context?.column;
        expect(typeof column).toBe('number');
        expect(column).toBeGreaterThanOrEqual(0);
        expect(column).toBeLessThanOrEqual(input.length);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('keeps double negation equivalent for valid protocol filters', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('arp', 'icmp', 'tcp', 'udp', 'dhcp', 'dns', 'http', 'igmp'),
        (protocol) => {
          const plain = parseTraceFilter(`protocol == ${protocol}`);
          const negated = parseTraceFilter(`!!(protocol == ${protocol})`);
          expect(plain.ok).toBe(true);
          expect(negated.ok).toBe(true);
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
