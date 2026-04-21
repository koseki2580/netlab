import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { predicateInputArb } from '../../testing/properties/arbitraries';
import { tutorialRegistry } from '..';

const SEED = 0x707ce54;

describe('tutorial predicates are deterministic and side-effect free', () => {
  for (const tutorial of tutorialRegistry.list()) {
    for (const step of tutorial.steps) {
      it(`${tutorial.id}/${step.id} returns a stable result without mutating its input`, () => {
        fc.assert(
          fc.property(predicateInputArb, (input) => {
            const before = structuredClone(input);
            const results = Array.from({ length: 10 }, () => step.predicate(input));

            expect(results.every((result) => result === results[0])).toBe(true);
            expect(input).toEqual(before);
          }),
          { seed: SEED, numRuns: 100 },
        );
      });
    }
  }
});
