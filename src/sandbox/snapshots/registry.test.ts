import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { fromEngine } from '../SimulationSnapshot';
import type { SimulationSnapshot } from '../types';
import type { NamedSnapshot } from './types';
import {
  getSnapshotById,
  getSnapshotByName,
  listActiveSnapshots,
  listOrphanedSnapshots,
} from './registry';

const activeA: NamedSnapshot = Object.freeze({
  id: 'snapshot-a',
  name: 'Before MTU',
  editIndex: 1,
  sessionIdAtCapture: 'session-1',
  createdAt: 4,
});

const activeB: NamedSnapshot = Object.freeze({
  id: 'snapshot-b',
  name: 'After MTU',
  editIndex: 3,
  sessionIdAtCapture: 'session-1',
  createdAt: 7,
});

const reserved: NamedSnapshot = Object.freeze({
  id: 'snapshot-internal',
  name: '__beta_baseline__',
  editIndex: 0,
  sessionIdAtCapture: 'session-1',
  createdAt: 2,
});

const orphaned: NamedSnapshot = Object.freeze({
  id: 'snapshot-orphaned',
  name: 'Old branch',
  editIndex: 5,
  sessionIdAtCapture: 'session-1',
  createdAt: 8,
});

function snapshotWithRegistries(
  active: readonly NamedSnapshot[] = [],
  orphans: readonly NamedSnapshot[] = [],
): SimulationSnapshot {
  return {
    ...fromEngine(new SimulationEngine(directTopology(), new HookEngine())),
    snapshotRegistry: active,
    orphanedSnapshotRegistry: orphans,
  };
}

describe('snapshot registry accessors', () => {
  it('lists public active snapshots and hides reserved internal names', () => {
    const snapshot = snapshotWithRegistries([activeA, reserved, activeB]);

    expect(listActiveSnapshots(snapshot)).toEqual([activeA, activeB]);
  });

  it('returns an empty active list for snapshots without public entries', () => {
    const snapshot = snapshotWithRegistries([reserved]);

    expect(listActiveSnapshots(snapshot)).toEqual([]);
  });

  it('lists orphaned snapshots without filtering names', () => {
    const snapshot = snapshotWithRegistries([activeA], [orphaned]);

    expect(listOrphanedSnapshots(snapshot)).toEqual([orphaned]);
  });

  it('returns an empty orphan list when no snapshots were orphaned', () => {
    expect(listOrphanedSnapshots(snapshotWithRegistries([activeA]))).toEqual([]);
  });

  it('finds a public active snapshot by name', () => {
    const snapshot = snapshotWithRegistries([activeA, activeB]);

    expect(getSnapshotByName(snapshot, 'After MTU')).toBe(activeB);
  });

  it('does not find reserved snapshots by name', () => {
    const snapshot = snapshotWithRegistries([reserved]);

    expect(getSnapshotByName(snapshot, '__beta_baseline__')).toBeUndefined();
  });

  it('returns undefined for unknown names', () => {
    const snapshot = snapshotWithRegistries([activeA]);

    expect(getSnapshotByName(snapshot, 'missing')).toBeUndefined();
  });

  it('finds a public active snapshot by id', () => {
    const snapshot = snapshotWithRegistries([activeA, activeB]);

    expect(getSnapshotById(snapshot, 'snapshot-a')).toBe(activeA);
  });

  it('does not find reserved snapshots by id', () => {
    const snapshot = snapshotWithRegistries([reserved]);

    expect(getSnapshotById(snapshot, 'snapshot-internal')).toBeUndefined();
  });

  it('returns undefined for unknown ids', () => {
    const snapshot = snapshotWithRegistries([activeA]);

    expect(getSnapshotById(snapshot, 'missing')).toBeUndefined();
  });
});
