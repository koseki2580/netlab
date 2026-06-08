/**
 * @property-seed 0x5a4b12 Subnetting solver ordering + generator round-trip.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ipToInt } from '../../../utils/cidr';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../../testing/seeds';
import { generateProblem } from '../generator';
import { expectedAnswer, grade } from '../grader';
import { subnetFacts } from '../solver';

const ipArb = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
);

describe('subnetFacts invariants', () => {
  it('orders network <= first <= last <= broadcast and counts hosts as 2^(32-p) - 2', () => {
    fc.assert(
      fc.property(ipArb, fc.integer({ min: 1, max: 30 }), ([a, b, c, d], prefix) => {
        const facts = subnetFacts(`${a}.${b}.${c}.${d}`, prefix);
        const net = ipToInt(facts.networkAddress);
        const bcast = ipToInt(facts.broadcastAddress);
        const first = ipToInt(facts.firstUsableHost as string);
        const last = ipToInt(facts.lastUsableHost as string);

        expect(net <= first).toBe(true);
        expect(first <= last).toBe(true);
        expect(last <= bcast).toBe(true);
        expect(facts.usableHostCount).toBe(2 ** (32 - prefix) - 2);
        expect(facts.totalAddresses).toBe(bcast - net + 1);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});

describe('generator round-trip', () => {
  it('always grades its own canonical answer as correct', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0x7fffffff }), fc.nat({ max: 5000 }), (seed, seq) => {
        const problem = generateProblem(seed, seq);
        const { expected } = expectedAnswer(problem);
        expect(grade(problem, expected).correct).toBe(true);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
