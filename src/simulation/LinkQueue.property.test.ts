/**
 * @property-seed 0x5a4b12 plan/81a link queue bounds and determinism.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../testing/seeds';
import { LinkQueue } from './LinkQueue';

function segment(index: number) {
  return { id: `seg-${index}`, byteLength: 1500 };
}

describe('LinkQueue properties', () => {
  it('never stores more queued segments than queueDepthSegments', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 50 }),
        (depth, arrivals) => {
          const queue = new LinkQueue({ queueDepthSegments: depth });
          for (let index = 0; index < arrivals; index += 1) {
            queue.enqueue(segment(index), 0);
            expect(queue.getState().queue.length).toBeLessThanOrEqual(depth);
          }
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('computes the same drop set for the same seed and sequence range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 200 }),
        (lossSeed, lossPct, count) => {
          const cfg = { lossPct, lossSeed };
          const left = Array.from({ length: count }, (_, index) =>
            LinkQueue.shouldDrop(cfg, index + 1),
          );
          const right = Array.from({ length: count }, (_, index) =>
            LinkQueue.shouldDrop(cfg, index + 1),
          );

          expect(left).toEqual(right);
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('conserves enqueued segments after enough ticks without loss', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), (count) => {
        const queue = new LinkQueue({ bandwidthBps: 1_000_000, propagationDelayMs: 10 });
        for (let index = 0; index < count; index += 1) {
          queue.enqueue(segment(index), 0);
        }

        for (let step = 0; step <= count * 30; step += 1) {
          queue.tickStep(step);
        }

        const state = queue.getState();
        expect(state.counters.enqueued).toBe(
          state.counters.dequeued + state.counters.dropped + state.queue.length,
        );
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
