import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { EditSession } from '../../EditSession';
import { fromEngine, snapshotEquals } from '../../SimulationSnapshot';
import type { Edit } from '../../edits';
import { clearSnapshotAtCache, getSnapshotAt } from '../getSnapshotAt';

const PROPERTY_SEED = 0x5a4b71;

function root() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

const editArb: fc.Arbitrary<Edit> = fc.oneof(
  fc.constant({ kind: 'noop' } satisfies Edit),
  fc.record({
    kind: fc.constant('param.set' as const),
    key: fc.constant('engine.tickMs' as const),
    before: fc.constant(100),
    after: fc.integer({ min: 50, max: 500 }),
  }),
);

describe('snapshot diff purity property', () => {
  it('materializing the same snapshot index is deterministic', () => {
    fc.assert(
      fc.property(
        fc.array(editArb, { maxLength: 12 }),
        fc.integer({ min: 0, max: 12 }),
        (edits, index) => {
          clearSnapshotAtCache();
          const session = new EditSession(edits);
          const base = root();
          const bounded = Math.min(index, session.head);
          const first = getSnapshotAt(base, session, bounded);
          const second = getSnapshotAt(base, session, bounded);

          expect(snapshotEquals(first, second)).toBe(true);
        },
      ),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });
});
