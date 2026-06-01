/**
 * @property-seed 0x5a4b12 DSCP shaper per-class bounds and determinism.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { LinkShaperConfig } from '../../types/link';
import { LinkShaper } from '../LinkShaper';
import type { QueuedSegment } from '../LinkQueue';

function queued(index: number): QueuedSegment {
  return {
    segment: { id: `seg-${index}`, byteLength: 500 },
    enqueuedAtStep: index,
    seq: index + 1,
  };
}

function config(depth: number): LinkShaperConfig {
  return {
    classes: [
      { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: depth },
      { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: depth, default: true },
    ],
  };
}

function drainOrder(cfg: LinkShaperConfig, dscps: readonly number[]): string[] {
  const shaper = new LinkShaper(cfg, 10);
  dscps.forEach((dscp, index) => {
    shaper.enqueue(queued(index), dscp, index);
  });
  return Array.from({ length: dscps.length }, () => shaper.drainOneSlot()?.classId).filter(
    (classId): classId is string => classId !== undefined,
  );
}

describe('DSCP shaper bounds properties', () => {
  it('never lets a class queue exceed queueDepthSegments', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.constantFrom(0, 10, 46), { minLength: 1, maxLength: 80 }),
        (depth, dscps) => {
          const shaper = new LinkShaper(config(depth));
          dscps.forEach((dscp, index) => {
            shaper.enqueue(queued(index), dscp, index);
            for (const klass of shaper.getState().classes) {
              expect(klass.queue.length).toBeLessThanOrEqual(depth);
            }
          });
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('maps unmatched DSCP values to the default class', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 63 }), (dscp) => {
        fc.pre(dscp !== 46);
        expect(LinkShaper.classifyDscp(config(4), dscp)).toBe(1);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('produces the same dequeue order for the same arrivals and config', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.constantFrom(0, 46), { minLength: 1, maxLength: 80 }),
        (depth, dscps) => {
          const cfg = config(depth);
          expect(drainOrder(cfg, dscps)).toEqual(drainOrder(cfg, dscps));
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
