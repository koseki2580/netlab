import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { EditSession } from '../../EditSession';
import { fromEngine, snapshotEquals } from '../../SimulationSnapshot';
import type { Edit } from '../../edits';
import { incrementalRerun } from '../incremental-rerun';
import { CheckpointLadder } from '../ladder';

const SEED = 0x5a4b74;

function root() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

const editArb: fc.Arbitrary<Edit> = fc.oneof(
  fc.constant({ kind: 'noop' } as const),
  fc.integer({ min: 50, max: 500 }).map((after) => ({
    kind: 'param.set',
    key: 'engine.tickMs',
    before: 100,
    after,
  })),
  fc.integer({ min: 8, max: 128 }).map((after) => ({
    kind: 'param.set',
    key: 'engine.maxTtl',
    before: 64,
    after,
  })),
) as fc.Arbitrary<Edit>;

describe('incremental checkpoint equivalence', () => {
  it('matches a full replay for seeded edit sequences', () => {
    fc.assert(
      fc.property(
        fc.array(editArb, { maxLength: 40 }),
        fc.integer({ min: 1, max: 10 }),
        (edits, interval) => {
          const base = root();
          const session = edits.reduce<EditSession>(
            (current, edit) => current.push(edit),
            EditSession.empty(),
          );
          const ladder = new CheckpointLadder({ interval, capacity: 20 });

          for (let index = 1; index <= session.head; index += 1) {
            ladder.onPush(index, session.goToHead(index).apply(base));
          }

          for (let index = 0; index <= session.head; index += 1) {
            expect(
              snapshotEquals(
                incrementalRerun(base, session, ladder, index),
                session.goToHead(index).apply(base),
              ),
            ).toBe(true);
          }
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });
});
