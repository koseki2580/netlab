import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { EditSession } from '../EditSession';
import { fromEngine, snapshotEquals } from '../SimulationSnapshot';
import type { Edit } from '../edits';
import { clearSnapshotAtCache, getSnapshotAt } from './getSnapshotAt';

function root() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

function tickEdit(after: number): Edit {
  return { kind: 'param.set', key: 'engine.tickMs', before: 100, after };
}

describe('getSnapshotAt', () => {
  it('materializes the root snapshot at edit index zero', () => {
    const base = root();
    const session = EditSession.empty().push(tickEdit(200));

    expect(getSnapshotAt(base, session, 0)).toBe(base);
  });

  it('materializes edits up to the requested index', () => {
    const base = root();
    const session = EditSession.empty().push(tickEdit(200)).push({
      kind: 'param.set',
      key: 'engine.maxTtl',
      before: 64,
      after: 32,
    });

    const result = getSnapshotAt(base, session, 1);

    expect(result.parameters.engine.tickMs).toBe(200);
    expect(result.parameters.engine.maxTtl).toBe(64);
  });

  it('uses the visible head as the maximum materialized index', () => {
    const base = root();
    const session = EditSession.empty()
      .push(tickEdit(200))
      .push({
        kind: 'param.set',
        key: 'engine.maxTtl',
        before: 64,
        after: 32,
      })
      .undo();

    expect(getSnapshotAt(base, session, 2).parameters.engine.maxTtl).toBe(64);
  });

  it('returns the same cached reference for repeated calls', () => {
    const base = root();
    const session = EditSession.empty().push(tickEdit(200));

    expect(getSnapshotAt(base, session, 1)).toBe(getSnapshotAt(base, session, 1));
  });

  it('clears cached references on demand', () => {
    const base = root();
    const session = EditSession.empty().push(tickEdit(200));
    const first = getSnapshotAt(base, session, 1);

    clearSnapshotAtCache();

    expect(getSnapshotAt(base, session, 1)).not.toBe(first);
    expect(snapshotEquals(getSnapshotAt(base, session, 1), first)).toBe(true);
  });

  it('evicts the oldest entries after twenty cached snapshots', () => {
    const base = root();
    const session = Array.from({ length: 21 }, (_, index) => tickEdit(101 + index)).reduce(
      (current, edit) => current.push(edit),
      EditSession.empty(),
    );
    const first = getSnapshotAt(base, session, 1);

    for (let index = 2; index <= 21; index += 1) {
      getSnapshotAt(base, session, index);
    }

    expect(getSnapshotAt(base, session, 1)).not.toBe(first);
  });

  it('rejects negative edit indexes', () => {
    expect(() => getSnapshotAt(root(), EditSession.empty(), -1)).toThrow(/editIndex/);
  });
});
