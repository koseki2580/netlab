import type { SimulationSnapshot } from '../types';

export interface Checkpoint {
  readonly editIndex: number;
  readonly snapshot: SimulationSnapshot;
  readonly createdAt: number;
}

export interface CheckpointLadderOptions {
  readonly capacity?: number;
  readonly interval?: number;
}

const DEFAULT_CAPACITY = 20;
const DEFAULT_INTERVAL = 10;

export class CheckpointLadder {
  private checkpoints: Checkpoint[] = [];
  private readonly capacity: number;
  private readonly interval: number;

  constructor(opts: CheckpointLadderOptions = {}) {
    this.capacity = Math.max(0, Math.floor(opts.capacity ?? DEFAULT_CAPACITY));
    this.interval = Math.max(0, Math.floor(opts.interval ?? DEFAULT_INTERVAL));
  }

  onPush(editIndex: number, snapshot: SimulationSnapshot): void {
    if (
      this.capacity === 0 ||
      this.interval === 0 ||
      !Number.isInteger(editIndex) ||
      editIndex <= 0 ||
      editIndex % this.interval !== 0
    ) {
      return;
    }

    const checkpoint: Checkpoint = {
      editIndex,
      snapshot,
      createdAt: Date.now(),
    };
    this.checkpoints = this.checkpoints.filter((entry) => entry.editIndex !== editIndex);
    this.checkpoints.push(checkpoint);
    this.checkpoints.sort((left, right) => left.editIndex - right.editIndex);

    while (this.checkpoints.length > this.capacity) {
      this.checkpoints.shift();
    }
  }

  nearestBefore(editIndex: number): Checkpoint | null {
    if (!Number.isInteger(editIndex) || editIndex <= 0) {
      return null;
    }

    for (let index = this.checkpoints.length - 1; index >= 0; index -= 1) {
      const checkpoint = this.checkpoints[index];
      if (checkpoint && checkpoint.editIndex <= editIndex) {
        return checkpoint;
      }
    }

    return null;
  }

  pruneAfter(editIndex: number): void {
    this.checkpoints = this.checkpoints.filter((entry) => entry.editIndex <= editIndex);
  }

  clear(): void {
    this.checkpoints = [];
  }

  size(): number {
    return this.checkpoints.length;
  }
}
