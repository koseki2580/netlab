import type { EditSession } from '../EditSession';
import { reduceEdit } from '../edits';
import type { SimulationSnapshot } from '../types';
import type { CheckpointLadder } from './ladder';

export function incrementalRerun(
  initialSnapshot: SimulationSnapshot,
  session: EditSession,
  ladder: CheckpointLadder,
  targetEditIndex: number = session.head,
): SimulationSnapshot {
  if (!Number.isInteger(targetEditIndex) || targetEditIndex < 0) {
    throw new RangeError(`targetEditIndex must be a non-negative integer, got ${targetEditIndex}`);
  }

  const boundedIndex = Math.min(targetEditIndex, session.head);
  if (boundedIndex === 0) {
    return initialSnapshot;
  }

  const checkpoint = ladder.nearestBefore(boundedIndex);
  const startIndex = checkpoint?.editIndex ?? 0;
  const startSnapshot = checkpoint?.snapshot ?? initialSnapshot;

  return session.backing
    .slice(startIndex, boundedIndex)
    .reduce<SimulationSnapshot>((current, edit) => reduceEdit(current, edit), startSnapshot);
}
