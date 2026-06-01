/**
 * @property-seed 0x5a4b12 ECMP distribution sanity.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { bucketFlow, type FlowKey } from '../../utils/hashFlow';

describe('ECMP distribution properties', () => {
  it('uses every bucket across a deterministic port sweep', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.integer({ min: 0, max: 0xffff }),
        (bucketCount, seed) => {
          const buckets = new Set<number>();

          for (let srcPort = 10_000; srcPort < 12_000; srcPort += 1) {
            const flow: FlowKey = {
              srcIp: '10.0.0.10',
              dstIp: '203.0.113.10',
              protocol: 6,
              srcPort,
              dstPort: 443,
            };
            buckets.add(bucketFlow(flow, bucketCount, seed));
          }

          expect(buckets.size).toBe(bucketCount);
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
