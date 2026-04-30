import { hookEngine } from '../../hooks/HookEngine';
import { cloneSnapshot } from '../SimulationSnapshot';
import type { SimulationSnapshot } from '../types';
import type { NamedSnapshot, SnapshotEdit } from './types';
import {
  DEFAULT_MAX_NAMED_SNAPSHOTS,
  SNAPSHOT_NAME_MAX_LENGTH,
  isReservedSnapshotName,
} from './types';

function withRegistries(
  snapshot: SimulationSnapshot,
  snapshotRegistry: readonly NamedSnapshot[],
  orphanedSnapshotRegistry: readonly NamedSnapshot[] = snapshot.orphanedSnapshotRegistry,
): SimulationSnapshot {
  return cloneSnapshot({
    ...snapshot,
    snapshotRegistry,
    orphanedSnapshotRegistry,
  });
}

function namesClash(snapshots: readonly NamedSnapshot[], name: string, exceptId?: string): boolean {
  return snapshots.some((entry) => entry.id !== exceptId && entry.name === name);
}

function validUserName(name: string): boolean {
  return name.trim().length > 0 && name.length <= SNAPSHOT_NAME_MAX_LENGTH;
}

function emitSnapshotRejected(
  event:
    | 'sandbox:snapshot-invalid-name'
    | 'sandbox:snapshot-reserved-name'
    | 'sandbox:snapshot-duplicate-name'
    | 'sandbox:snapshot-cap-exceeded',
  payload: { readonly name: string } | { readonly max: number },
): void {
  void hookEngine.emit(event, payload);
}

function createSnapshot(
  snapshot: SimulationSnapshot,
  edit: Extract<SnapshotEdit, { readonly kind: 'snapshot.create' }>,
): SimulationSnapshot {
  const entry = edit.snapshot;

  if (!validUserName(entry.name)) {
    emitSnapshotRejected('sandbox:snapshot-invalid-name', { name: entry.name });
    return snapshot;
  }

  if (isReservedSnapshotName(entry.name) && edit.internal !== true) {
    emitSnapshotRejected('sandbox:snapshot-reserved-name', { name: entry.name });
    return snapshot;
  }

  if (
    namesClash(snapshot.snapshotRegistry, entry.name) ||
    namesClash(snapshot.orphanedSnapshotRegistry, entry.name)
  ) {
    emitSnapshotRejected('sandbox:snapshot-duplicate-name', { name: entry.name });
    return snapshot;
  }

  if (snapshot.snapshotRegistry.length >= DEFAULT_MAX_NAMED_SNAPSHOTS) {
    emitSnapshotRejected('sandbox:snapshot-cap-exceeded', { max: DEFAULT_MAX_NAMED_SNAPSHOTS });
    return snapshot;
  }

  return withRegistries(snapshot, [...snapshot.snapshotRegistry, entry]);
}

function renameSnapshot(
  snapshot: SimulationSnapshot,
  edit: Extract<SnapshotEdit, { readonly kind: 'snapshot.rename' }>,
): SimulationSnapshot {
  if (!validUserName(edit.after) || isReservedSnapshotName(edit.after)) {
    return snapshot;
  }

  const existing = snapshot.snapshotRegistry.find((entry) => entry.id === edit.id);
  if (!existing || existing.name !== edit.before) {
    return snapshot;
  }

  if (namesClash(snapshot.snapshotRegistry, edit.after, edit.id)) {
    emitSnapshotRejected('sandbox:snapshot-duplicate-name', { name: edit.after });
    return snapshot;
  }

  return withRegistries(
    snapshot,
    snapshot.snapshotRegistry.map((entry) =>
      entry.id === edit.id ? { ...entry, name: edit.after } : entry,
    ),
  );
}

function deleteSnapshot(
  snapshot: SimulationSnapshot,
  edit: Extract<SnapshotEdit, { readonly kind: 'snapshot.delete' }>,
): SimulationSnapshot {
  if (isReservedSnapshotName(edit.before.name)) {
    return snapshot;
  }

  const exists = snapshot.snapshotRegistry.some((entry) => entry.id === edit.id);
  if (!exists) {
    if (edit.orphaned !== true) {
      return snapshot;
    }

    const alreadyOrphaned = snapshot.orphanedSnapshotRegistry.some((entry) => entry.id === edit.id);
    return alreadyOrphaned
      ? snapshot
      : withRegistries(snapshot, snapshot.snapshotRegistry, [
          ...snapshot.orphanedSnapshotRegistry,
          edit.before,
        ]);
  }

  return withRegistries(
    snapshot,
    snapshot.snapshotRegistry.filter((entry) => entry.id !== edit.id),
  );
}

export function reduceSnapshotEdit(
  snapshot: SimulationSnapshot,
  edit: SnapshotEdit,
): SimulationSnapshot {
  switch (edit.kind) {
    case 'snapshot.create':
      return createSnapshot(snapshot, edit);
    case 'snapshot.rename':
      return renameSnapshot(snapshot, edit);
    case 'snapshot.delete':
      return deleteSnapshot(snapshot, edit);
  }
}
