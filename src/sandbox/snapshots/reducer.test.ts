import { describe, expect, it, vi } from 'vitest';
import { hookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { HookEngine } from '../../hooks/HookEngine';
import { EditSession } from '../EditSession';
import { fromEngine, snapshotEquals } from '../SimulationSnapshot';
import { reduceEdit, registeredKinds, type Edit } from '../edits';
import type { NamedSnapshot, SnapshotEdit } from './types';
import { reduceSnapshotEdit } from './reducer';

function makeRootSnapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

function named(overrides: Partial<NamedSnapshot> = {}): NamedSnapshot {
  return {
    id: overrides.id ?? 'snapshot-1',
    name: overrides.name ?? 'Before MTU',
    editIndex: overrides.editIndex ?? 0,
    sessionIdAtCapture: overrides.sessionIdAtCapture ?? 'session-1',
    createdAt: overrides.createdAt ?? 0,
  };
}

describe('snapshot reducer', () => {
  it('registers snapshot edit reducers', () => {
    expect(registeredKinds()).toEqual(
      expect.arrayContaining(['snapshot.create', 'snapshot.rename', 'snapshot.delete']),
    );
  });

  it('creates a named snapshot without changing simulation behavior', () => {
    const root = makeRootSnapshot();
    const entry = named();

    const result = reduceSnapshotEdit(root, { kind: 'snapshot.create', snapshot: entry });

    expect(result.snapshotRegistry).toEqual([entry]);
    expect(snapshotEquals(result, root)).toBe(true);
  });

  it('rejects duplicate names', async () => {
    const rejected = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:snapshot-duplicate-name', async (payload, next) => {
      rejected(payload);
      await next();
    });
    const root = makeRootSnapshot();
    const entry = named();
    const current = reduceSnapshotEdit(root, { kind: 'snapshot.create', snapshot: entry });

    const result = reduceSnapshotEdit(current, {
      kind: 'snapshot.create',
      snapshot: named({ id: 'snapshot-2', name: entry.name }),
    });
    await Promise.resolve();

    unsubscribe();
    expect(result).toBe(current);
    expect(rejected).toHaveBeenCalledWith({ name: entry.name });
  });

  it('rejects the eleventh active snapshot', async () => {
    const rejected = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:snapshot-cap-exceeded', async (payload, next) => {
      rejected(payload);
      await next();
    });
    const full = Array.from({ length: 10 }, (_, index) =>
      named({ id: `s-${index}`, name: `S${index}` }),
    ).reduce(
      (current, snapshot) => reduceSnapshotEdit(current, { kind: 'snapshot.create', snapshot }),
      makeRootSnapshot(),
    );

    const result = reduceSnapshotEdit(full, {
      kind: 'snapshot.create',
      snapshot: named({ id: 's-11', name: 'S11' }),
    });
    await Promise.resolve();

    unsubscribe();
    expect(result).toBe(full);
    expect(rejected).toHaveBeenCalledWith({ max: 10 });
  });

  it('rejects user-created reserved names', async () => {
    const rejected = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:snapshot-reserved-name', async (payload, next) => {
      rejected(payload);
      await next();
    });
    const root = makeRootSnapshot();

    const result = reduceSnapshotEdit(root, {
      kind: 'snapshot.create',
      snapshot: named({ name: '__beta_baseline__' }),
    });
    await Promise.resolve();

    unsubscribe();
    expect(result).toBe(root);
    expect(rejected).toHaveBeenCalledWith({ name: '__beta_baseline__' });
  });

  it('allows internal reserved names', () => {
    const root = makeRootSnapshot();
    const reserved = named({ name: '__beta_baseline__' });

    const result = reduceSnapshotEdit(root, {
      kind: 'snapshot.create',
      snapshot: reserved,
      internal: true,
    });

    expect(result.snapshotRegistry).toEqual([reserved]);
  });

  it('renames an existing snapshot', () => {
    const root = makeRootSnapshot();
    const entry = named();
    const current = reduceSnapshotEdit(root, { kind: 'snapshot.create', snapshot: entry });

    const result = reduceSnapshotEdit(current, {
      kind: 'snapshot.rename',
      id: entry.id,
      before: entry.name,
      after: 'After MTU',
    });

    expect(result.snapshotRegistry).toEqual([{ ...entry, name: 'After MTU' }]);
  });

  it('rejects rename name clashes', () => {
    const current = [named(), named({ id: 'snapshot-2', name: 'After MTU' })].reduce(
      (snapshot, entry) =>
        reduceSnapshotEdit(snapshot, { kind: 'snapshot.create', snapshot: entry }),
      makeRootSnapshot(),
    );

    const result = reduceSnapshotEdit(current, {
      kind: 'snapshot.rename',
      id: 'snapshot-2',
      before: 'After MTU',
      after: 'Before MTU',
    });

    expect(result).toBe(current);
  });

  it('deletes an existing snapshot', () => {
    const root = makeRootSnapshot();
    const entry = named();
    const current = reduceSnapshotEdit(root, { kind: 'snapshot.create', snapshot: entry });

    const result = reduceSnapshotEdit(current, {
      kind: 'snapshot.delete',
      id: entry.id,
      before: entry,
    });

    expect(result.snapshotRegistry).toEqual([]);
    expect(result.orphanedSnapshotRegistry).toEqual([]);
  });

  it('keeps reserved internal snapshots from deletion', () => {
    const root = makeRootSnapshot();
    const entry = named({ name: '__beta_baseline__' });
    const current = reduceSnapshotEdit(root, {
      kind: 'snapshot.create',
      snapshot: entry,
      internal: true,
    });

    const result = reduceSnapshotEdit(current, {
      kind: 'snapshot.delete',
      id: entry.id,
      before: entry,
    });

    expect(result).toBe(current);
  });

  it('treats non-existent delete and rename edits as no-ops', () => {
    const root = makeRootSnapshot();

    expect(
      reduceSnapshotEdit(root, { kind: 'snapshot.rename', id: 'missing', before: 'A', after: 'B' }),
    ).toBe(root);
    expect(
      reduceSnapshotEdit(root, { kind: 'snapshot.delete', id: 'missing', before: named() }),
    ).toBe(root);
  });

  it('applies snapshot edits through the shared reducer', () => {
    const root = makeRootSnapshot();
    const edit: SnapshotEdit = { kind: 'snapshot.create', snapshot: named() };

    const result = reduceEdit(root, edit);

    expect(result.snapshotRegistry).toEqual([edit.snapshot]);
  });

  it('migrates snapshot creates from a truncated redo tail to orphaned registry', () => {
    const entry = named({ editIndex: 2 });
    const first: Edit = { kind: 'noop' };
    const create: Edit = { kind: 'snapshot.create', snapshot: entry };
    const replacement: Edit = { kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 };
    const session = EditSession.empty().push(first).push(create).undo();

    const next = session.push(replacement);
    const result = next.apply(makeRootSnapshot());

    expect(result.snapshotRegistry).toEqual([]);
    expect(result.orphanedSnapshotRegistry).toEqual([entry]);
  });
});
