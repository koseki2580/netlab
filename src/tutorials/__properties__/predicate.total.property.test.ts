import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { tutorialRegistry } from '..';
import type { PredicateInput } from '../types';

const SEED = 0x707ce54;
const RAW_INPUT_ARB = fc.record({
  state: fc.anything(),
  events: fc.anything(),
});

describe('tutorial predicates are total', () => {
  for (const tutorial of tutorialRegistry.list()) {
    for (const step of tutorial.steps) {
      it(`${tutorial.id}/${step.id} never throws for arbitrary input shapes`, () => {
        fc.assert(
          fc.property(RAW_INPUT_ARB, (input) => {
            expect(() => step.predicate(input as PredicateInput)).not.toThrow();
          }),
          { seed: SEED, numRuns: 100 },
        );
      });
    }
  }
});
