import type { EditSession } from '../EditSession';
import { reduceEdit } from '../edits';
import type { SimulationSnapshot } from '../types';
import type { CheckpointLadder } from '../checkpoints/ladder';

const MAX_CACHE_ENTRIES = 20;
const sessionIds = new WeakMap<EditSession, number>();
let nextSessionId = 1;
const cache = new Map<string, SimulationSnapshot>();

function idFor(session: EditSession): number {
  const existing = sessionIds.get(session);
  if (existing !== undefined) {
    return existing;
  }

  const id = nextSessionId;
  nextSessionId += 1;
  sessionIds.set(session, id);
  return id;
}

function keyFor(base: SimulationSnapshot, session: EditSession, editIndex: number): string {
  return `${base.id}:${idFor(session)}:${editIndex}`;
}

function remember(key: string, snapshot: SimulationSnapshot): SimulationSnapshot {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, snapshot);

  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }

  return snapshot;
}

export function clearSnapshotAtCache(): void {
  cache.clear();
}

export function getSnapshotAt(
  initialSnapshot: SimulationSnapshot,
  session: EditSession,
  editIndex: number,
  options: { readonly ladder?: CheckpointLadder } = {},
): SimulationSnapshot {
  if (!Number.isInteger(editIndex) || editIndex < 0) {
    throw new RangeError(`editIndex must be a non-negative integer, got ${editIndex}`);
  }

  const boundedIndex = Math.min(editIndex, session.head);
  if (boundedIndex === 0) {
    return initialSnapshot;
  }

  const key = keyFor(initialSnapshot, session, boundedIndex);
  const checkpoint = options.ladder?.nearestBefore(boundedIndex) ?? null;
  if (!checkpoint) {
    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
  }

  const startIndex = checkpoint?.editIndex ?? 0;
  const startSnapshot = checkpoint?.snapshot ?? initialSnapshot;
  const materialized = session.backing
    .slice(startIndex, boundedIndex)
    .reduce<SimulationSnapshot>((current, edit) => reduceEdit(current, edit), startSnapshot);

  return remember(key, materialized);
}
