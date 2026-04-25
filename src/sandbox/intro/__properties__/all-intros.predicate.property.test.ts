import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { predicateInputArb } from '../../../testing/properties/arbitraries';
import type { PredicateInput } from '../../../tutorials/types';
import { introRegistry } from '../introRegistry';

const SEED = 0x65_17_0;

describe('sandbox intro predicates', () => {
  it('registry exposes all shipped intros', () => {
    expect(introRegistry.list()).toEqual([
      'sandbox-intro-mtu',
      'sandbox-intro-tcp',
      'sandbox-intro-ospf',
      'sandbox-intro-nat',
    ]);
  });

  for (const introId of introRegistry.list()) {
    const intro = introRegistry.get(introId)!;

    for (const step of intro.steps) {
      it(`${introId}/${step.id} is total for arbitrary runtime input shapes`, () => {
        fc.assert(
          fc.property(fc.record({ state: fc.anything(), events: fc.anything() }), (input) => {
            expect(() => step.predicate(input as PredicateInput)).not.toThrow();
          }),
          { seed: SEED, numRuns: 100 },
        );
      });

      it(`${introId}/${step.id} is deterministic and does not mutate input`, () => {
        fc.assert(
          fc.property(predicateInputArb, (input) => {
            const before = structuredClone(input);
            const first = step.predicate(input);
            const results = Array.from({ length: 5 }, () => step.predicate(input));

            expect(results.every((result) => result === first)).toBe(true);
            expect(input).toEqual(before);
          }),
          { seed: SEED, numRuns: 100 },
        );
      });
    }
  }
});
