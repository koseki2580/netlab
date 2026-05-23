/**
 * @property-seed 0x5a4b12 P-TS-1 MPLS LDP determinism and label stack invariants.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  parseMplsStack,
  popMplsLabel,
  pushMplsLabel,
  serializeMplsStack,
  swapMplsLabel,
} from '../../layers/l3-network/tunneling/MplsLabelStack';
import { convergeLdp } from '../../layers/l3-network/tunneling/MplsLdp';
import { cidrArb } from '../../testing/properties/arbitraries';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { MplsLabel, MplsLabelStack } from '../../types/tunneling';

const labelArb: fc.Arbitrary<MplsLabel> = fc.record({
  label: fc.integer({ min: 16, max: 1_048_575 }),
  tc: fc.integer({ min: 0, max: 7 }),
  endOfStack: fc.boolean(),
  ttl: fc.integer({ min: 1, max: 255 }),
});

function normalizedStack(stack: MplsLabelStack): MplsLabel[] {
  return stack.map((entry, index) => ({
    ...entry,
    endOfStack: index === stack.length - 1,
  }));
}

describe('MPLS LDP properties', () => {
  it('assigns deterministic labels for a seeded router/FEC input', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^r[1-9][0-9]?$/), { minLength: 2, maxLength: 8 }),
        cidrArb({ minPrefix: 8, maxPrefix: 30 }),
        fc.integer({ min: 16_000, max: 1_048_560 }),
        (routers, fec, baseLabel) => {
          const input = { routers, fec, baseLabel };
          const first = convergeLdp(input);
          const second = convergeLdp(input);

          expect(first).toEqual(second);
          expect(first.converged).toBe(true);
          expect(first.mappings).toHaveLength(routers.length);
          expect(first.mappings.map((mapping) => mapping.label)).toEqual(
            routers.map((_, index) => baseLabel + index),
          );
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('push, swap, and pop preserve the lower label-stack bytes', () => {
    fc.assert(
      fc.property(
        fc.array(labelArb, { maxLength: 4 }),
        labelArb,
        fc.integer({ min: 16, max: 1_048_575 }),
        (stack, topLabel, swappedLabel) => {
          const expectedLowerStack = normalizedStack(stack);
          const pushed = pushMplsLabel(stack, topLabel);
          const swapped = swapMplsLabel(pushed, swappedLabel);
          const popped = popMplsLabel(swapped);

          expect(popped.popped.label).toBe(swappedLabel);
          expect(serializeMplsStack(popped.stack)).toEqual(serializeMplsStack(expectedLowerStack));
          expect(parseMplsStack(serializeMplsStack(popped.stack))).toEqual(expectedLowerStack);
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
