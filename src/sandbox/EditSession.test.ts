import { describe, expect, it, vi } from 'vitest';
import { hookEngine } from '../hooks/HookEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { directTopology } from '../simulation/__fixtures__/topologies';
import { HookEngine } from '../hooks/HookEngine';
import { EditSession } from './EditSession';
import { fromEngine, snapshotEquals } from './SimulationSnapshot';
import type { Edit } from './edits';
import { registeredKinds } from './edits';

function makeSnapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

const inertEdits: Edit[] = [
  {
    kind: 'packet.header',
    target: { kind: 'packet', traceId: 'trace-1', hopIndex: 0 },
    fieldPath: 'l3.ttl',
    before: 64,
    after: 32,
  },
  {
    kind: 'interface.mtu',
    target: { kind: 'interface', nodeId: 'missing-node', ifaceId: 'eth0' },
    before: 1500,
    after: 900,
  },
  {
    kind: 'link.state',
    target: { kind: 'edge', edgeId: 'missing-edge' },
    before: 'up',
    after: 'down',
  },
];

const firstEdit: Edit = { kind: 'noop' };
const secondEdit: Edit = {
  kind: 'param.set',
  key: 'engine.tickMs',
  before: 100,
  after: 200,
};
const thirdEdit: Edit = {
  kind: 'interface.mtu',
  target: { kind: 'interface', nodeId: 'missing-node', ifaceId: 'eth0' },
  before: 1500,
  after: 900,
};

describe('EditSession', () => {
  it('creates an empty session', () => {
    const session = EditSession.empty();

    expect(session.edits).toEqual([]);
    expect(session.backing).toEqual([]);
    expect(session.head).toBe(0);
    expect(session.size()).toBe(0);
  });

  it('uses the shared reducer registry for axis edits', () => {
    expect(registeredKinds()).toContain('node.route.add');
  });

  it('empty session apply returns the original snapshot', () => {
    const snapshot = makeSnapshot();

    expect(EditSession.empty().apply(snapshot)).toBe(snapshot);
  });

  it('push returns a new session with one additional edit', () => {
    const session = EditSession.empty();
    const next = session.push({ kind: 'noop' });

    expect(next).not.toBe(session);
    expect(next.edits).toEqual([{ kind: 'noop' }]);
    expect(next.backing).toEqual([{ kind: 'noop' }]);
    expect(next.head).toBe(1);
    expect(next.size()).toBe(1);
  });

  it('push leaves the original session unchanged', () => {
    const session = EditSession.empty();

    session.push({ kind: 'noop' });

    expect(session.edits).toEqual([]);
    expect(session.size()).toBe(0);
  });

  it('preserves sequential apply order in the append-only log', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit);

    expect(session.edits).toEqual([firstEdit, secondEdit]);
  });

  it('undo moves the visible head back without deleting redo history', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit);
    const undone = session.undo();

    expect(undone.edits).toEqual([firstEdit]);
    expect(undone.backing).toEqual([firstEdit, secondEdit]);
    expect(undone.head).toBe(1);
    expect(undone.canUndo()).toBe(true);
    expect(undone.canRedo()).toBe(true);
  });

  it('undo is a boundary no-op at head zero', () => {
    const session = EditSession.empty();

    expect(session.undo()).toBe(session);
    expect(session.canUndo()).toBe(false);
    expect(session.canRedo()).toBe(false);
  });

  it('redo restores the next redo-tail edit', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit).undo();
    const redone = session.redo();

    expect(redone.edits).toEqual([firstEdit, secondEdit]);
    expect(redone.head).toBe(2);
    expect(redone.canRedo()).toBe(false);
  });

  it('redo is a boundary no-op at the end of history', () => {
    const session = EditSession.empty().push(firstEdit);

    expect(session.redo()).toBe(session);
    expect(session.canRedo()).toBe(false);
  });

  it('push after undo truncates the redo tail', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit).undo().push(thirdEdit);

    expect(session.edits).toEqual([firstEdit, thirdEdit]);
    expect(session.backing).toEqual([firstEdit, thirdEdit]);
    expect(session.head).toBe(2);
    expect(session.canRedo()).toBe(false);
  });

  it('size returns the visible head, not the backing length', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit).undo();

    expect(session.size()).toBe(1);
    expect(session.backing).toHaveLength(2);
  });

  it('freezes the session and backing history', () => {
    const session = EditSession.empty().push(firstEdit);

    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session.backing)).toBe(true);
    expect(Object.isFrozen(session.edits)).toBe(true);
  });

  it('keeps at most one hundred history entries', () => {
    const session = Array.from({ length: 101 }, () => ({ kind: 'noop' }) as Edit).reduce(
      (current, edit) => current.push(edit),
      EditSession.empty(),
    );

    expect(session.backing).toHaveLength(100);
    expect(session.head).toBe(100);
  });

  it('revertAt removes the first visible edit', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit).push(thirdEdit);
    const reverted = session.revertAt(0);

    expect(reverted.edits).toEqual([secondEdit, thirdEdit]);
    expect(reverted.backing).toEqual([secondEdit, thirdEdit]);
    expect(reverted.head).toBe(2);
  });

  it('revertAt removes a middle visible edit and preserves relative order', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit).push(thirdEdit);
    const reverted = session.revertAt(1);

    expect(reverted.edits).toEqual([firstEdit, thirdEdit]);
    expect(reverted.canRedo()).toBe(false);
  });

  it('revertAt removes the edit just before the head', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit).push(thirdEdit);

    expect(session.revertAt(2).edits).toEqual([firstEdit, secondEdit]);
  });

  it('revertAt past the visible head is a no-op', () => {
    const session = EditSession.empty().push(firstEdit).push(secondEdit).undo();

    expect(session.revertAt(1)).toBe(session);
  });

  it('revertAt with a negative index is a no-op', () => {
    const session = EditSession.empty().push(firstEdit);

    expect(session.revertAt(-1)).toBe(session);
  });

  it('noop apply is identity', () => {
    const snapshot = makeSnapshot();
    const result = EditSession.empty().push({ kind: 'noop' }).apply(snapshot);

    expect(result).toBe(snapshot);
  });

  it.each(inertEdits)('%s applies as a no-op when its target is absent', (edit) => {
    const snapshot = makeSnapshot();
    const result = EditSession.empty().push(edit).apply(snapshot);

    expect(result).toBe(snapshot);
    expect(snapshotEquals(result, snapshot)).toBe(true);
  });

  it('unknown kinds emit sandbox:edit-rejected and return identity', async () => {
    const rejected = vi.fn((payload: unknown) => {
      void payload;
    });
    const unsubscribe = hookEngine.on('sandbox:edit-rejected', async (payload, next) => {
      rejected(payload);
      await next();
    });
    const snapshot = makeSnapshot();
    const unknownEdit = { kind: 'future.edit', target: 'x' } as unknown as Edit;

    const result = EditSession.empty().push(unknownEdit).apply(snapshot);
    await Promise.resolve();

    unsubscribe();
    expect(result).toBe(snapshot);
    expect(rejected).toHaveBeenCalledWith({
      edit: unknownEdit,
      reason: 'unknown-kind',
    });
  });

  it('two sessions with identical edits are structurally equal', () => {
    const edit: Edit = { kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 };
    const first = EditSession.empty().push({ kind: 'noop' }).push(edit);
    const second = EditSession.empty().push({ kind: 'noop' }).push(edit);

    expect(first).toEqual(second);
  });

  it('size matches edits.length', () => {
    const session = EditSession.empty()
      .push({ kind: 'noop' })
      .push({ kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 });

    expect(session.size()).toBe(session.edits.length);
  });

  it('apply is deterministic for inert sessions', () => {
    const snapshot = makeSnapshot();
    const session = inertEdits.reduce((current, edit) => current.push(edit), EditSession.empty());

    expect(session.apply(snapshot)).toBe(session.apply(snapshot));
  });

  it('apply is idempotent for inert sessions', () => {
    const snapshot = makeSnapshot();
    const session = inertEdits.reduce((current, edit) => current.push(edit), EditSession.empty());
    const once = session.apply(snapshot);
    const twice = session.apply(once);

    expect(snapshotEquals(twice, once)).toBe(true);
  });
});
