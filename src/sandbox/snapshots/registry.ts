import type { SimulationSnapshot } from '../types';
import type { NamedSnapshot } from './types';
import { isReservedSnapshotName } from './types';

export function listActiveSnapshots(snapshot: SimulationSnapshot): readonly NamedSnapshot[] {
  return snapshot.snapshotRegistry.filter((entry) => !isReservedSnapshotName(entry.name));
}

export function listOrphanedSnapshots(snapshot: SimulationSnapshot): readonly NamedSnapshot[] {
  return snapshot.orphanedSnapshotRegistry;
}

export function getSnapshotByName(
  snapshot: SimulationSnapshot,
  name: string,
): NamedSnapshot | undefined {
  return listActiveSnapshots(snapshot).find((entry) => entry.name === name);
}

export function getSnapshotById(
  snapshot: SimulationSnapshot,
  id: string,
): NamedSnapshot | undefined {
  return listActiveSnapshots(snapshot).find((entry) => entry.id === id);
}
