/**
 * @property-seed 0x5a4b12 ECMP flow stickiness.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { bucketFlow, type FlowKey } from '../../utils/hashFlow';

describe('ECMP stickiness properties', () => {
  it('keeps the same flow in the same bucket for a fixed router seed', () => {
    fc.assert(
      fc.property(
        fc.ipV4(),
        fc.ipV4(),
        fc.integer({ min: 1, max: 255 }),
        fc.integer({ min: 0, max: 65535 }),
        fc.integer({ min: 0, max: 65535 }),
        fc.integer({ min: 2, max: 8 }),
        fc.integer({ min: 0, max: 0xffff_ffff }),
        (srcIp, dstIp, protocol, srcPort, dstPort, bucketCount, seed) => {
          const flow: FlowKey = { srcIp, dstIp, protocol, srcPort, dstPort };

          expect(bucketFlow(flow, bucketCount, seed)).toBe(bucketFlow(flow, bucketCount, seed));
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
