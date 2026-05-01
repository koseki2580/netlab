import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { fromEngine } from '../../SimulationSnapshot';
import { CheckpointLadder } from '../ladder';

const SEED = 0x5a4b74;

function snapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

describe('CheckpointLadder invariants', () => {
  it('never exceeds capacity and returns only checkpoints before the target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 10 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { maxLength: 50 }),
        (capacity, interval, indexes) => {
          const ladder = new CheckpointLadder({ capacity, interval });

          for (const index of indexes) {
            ladder.onPush(index, snapshot());
            expect(ladder.size()).toBeLessThanOrEqual(capacity);
          }

          for (const target of indexes) {
            const nearest = ladder.nearestBefore(target);
            expect(nearest === null || nearest.editIndex <= target).toBe(true);
          }
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('prunes all checkpoints after the requested edit index', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (head) => {
        const ladder = new CheckpointLadder({ capacity: 20, interval: 1 });
        for (let index = 1; index <= 30; index += 1) {
          ladder.onPush(index, snapshot());
        }

        ladder.pruneAfter(head);

        const nearest = ladder.nearestBefore(100);
        expect(nearest === null || nearest.editIndex <= head).toBe(true);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });
});
