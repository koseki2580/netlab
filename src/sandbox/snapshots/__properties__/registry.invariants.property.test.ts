import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { fromEngine } from '../../SimulationSnapshot';
import type { SnapshotEdit } from '../types';
import { reduceSnapshotEdit } from '../reducer';

const PROPERTY_SEED = 0x5a4b71;

function root() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

const createArb: fc.Arbitrary<SnapshotEdit> = fc.record({
  kind: fc.constant('snapshot.create' as const),
  snapshot: fc.record({
    id: fc.string({ minLength: 1, maxLength: 8 }),
    name: fc.string({ minLength: 1, maxLength: 12 }).filter((name) => !name.startsWith('__')),
    editIndex: fc.integer({ min: 0, max: 10 }),
    sessionIdAtCapture: fc.constant('property-session'),
    createdAt: fc.integer({ min: -1, max: 20 }),
  }),
});

describe('snapshot registry invariants property', () => {
  it('keeps active snapshot names unique and under the cap', () => {
    fc.assert(
      fc.property(fc.array(createArb, { maxLength: 30 }), (edits) => {
        const result = edits.reduce((snapshot, edit) => reduceSnapshotEdit(snapshot, edit), root());
        const activeNames = result.snapshotRegistry.map((snapshot) => snapshot.name);

        expect(new Set(activeNames).size).toBe(activeNames.length);
        expect(result.snapshotRegistry.length).toBeLessThanOrEqual(10);
      }),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });

  it('rejects user-created reserved names from the active registry', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 8 }), { maxLength: 20 }),
        (names) => {
          const result = names
            .map(
              (suffix, index): SnapshotEdit => ({
                kind: 'snapshot.create',
                snapshot: {
                  id: `reserved-${index}`,
                  name: `__${suffix}`,
                  editIndex: index,
                  sessionIdAtCapture: 'property-session',
                  createdAt: -1,
                },
              }),
            )
            .reduce((snapshot, edit) => reduceSnapshotEdit(snapshot, edit), root());

          expect(result.snapshotRegistry).toEqual([]);
        },
      ),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });
});
