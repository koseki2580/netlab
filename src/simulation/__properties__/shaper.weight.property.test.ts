/**
 * @property-seed 0x5a4b12 plan/81g DSCP shaper weight ratios.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { LinkShaperConfig } from '../../types/link';
import { LinkShaper } from '../LinkShaper';
import type { QueuedSegment } from '../LinkQueue';

function queued(id: string, bytes = 100): QueuedSegment {
  return {
    segment: { id, byteLength: bytes },
    enqueuedAtStep: 0,
    seq: Number(id.replace(/\D/g, '') || 1),
  };
}

function config(efWeight: number, afWeight: number): LinkShaperConfig {
  const beWeight = 100 - efWeight - afWeight;
  return {
    classes: [
      { id: 'ef', dscp: [46], weightPct: efWeight, queueDepthSegments: 500 },
      { id: 'af21', dscp: [18], weightPct: afWeight, queueDepthSegments: 500 },
      { id: 'be', dscp: [], weightPct: beWeight, queueDepthSegments: 500, default: true },
    ],
  };
}

describe('DSCP shaper weight properties', () => {
  it('drains sustained backlogs near configured byte weights', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 70 }),
        fc.integer({ min: 10, max: 60 }),
        (efWeight, afWeight) => {
          fc.pre(efWeight + afWeight <= 90);
          const cfg = config(efWeight, afWeight);
          const shaper = new LinkShaper(cfg, 10);
          const dscps = [46, 18, 0] as const;
          for (let index = 0; index < 500; index += 1) {
            for (const dscp of dscps) {
              shaper.enqueue(queued(`${dscp}-${index}`), dscp, 0);
            }
          }

          const drainedBytes = new Map<string, number>();
          for (let index = 0; index < 300; index += 1) {
            const drained = shaper.drainOneSlot();
            if (!drained) break;
            drainedBytes.set(
              drained.classId,
              (drainedBytes.get(drained.classId) ?? 0) + drained.queued.segment.byteLength,
            );
          }

          const total = Array.from(drainedBytes.values()).reduce((sum, value) => sum + value, 0);
          for (const klass of cfg.classes) {
            const observed = (drainedBytes.get(klass.id) ?? 0) / total;
            expect(Math.abs(observed - klass.weightPct / 100)).toBeLessThanOrEqual(0.05);
          }
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
