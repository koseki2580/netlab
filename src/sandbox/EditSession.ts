import type { SimulationSnapshot } from './types';
import type { Edit } from './edits';
import { reduceEdit } from './edits';

export class EditSession {
  static readonly MAX_HISTORY = 100;

  readonly backing: readonly Edit[];
  readonly head: number;

  constructor(edits: readonly Edit[] = [], head: number = edits.length) {
    const bounded = edits.slice(-EditSession.MAX_HISTORY);
    const dropped = edits.length - bounded.length;
    const nextHead = Math.max(0, Math.min(head - dropped, bounded.length));

    this.backing = Object.freeze([...bounded]);
    this.head = nextHead;
    Object.freeze(this);
  }

  static empty(): EditSession {
    return new EditSession();
  }

  get edits(): readonly Edit[] {
    return Object.freeze(this.backing.slice(0, this.head));
  }

  push(edit: Edit): EditSession {
    return new EditSession([...this.backing.slice(0, this.head), edit]);
  }

  undo(): EditSession {
    if (!this.canUndo()) {
      return this;
    }

    return new EditSession(this.backing, this.head - 1);
  }

  redo(): EditSession {
    if (!this.canRedo()) {
      return this;
    }

    return new EditSession(this.backing, this.head + 1);
  }

  canUndo(): boolean {
    return this.head > 0;
  }

  canRedo(): boolean {
    return this.head < this.backing.length;
  }

  revertAt(index: number): EditSession {
    if (!Number.isInteger(index) || index < 0 || index >= this.head) {
      return this;
    }

    const visible = this.backing.slice(0, this.head);
    const next = [...visible.slice(0, index), ...visible.slice(index + 1)];
    return new EditSession(next);
  }

  apply(base: SimulationSnapshot): SimulationSnapshot {
    return this.edits.reduce<SimulationSnapshot>(
      (current, edit: unknown) => reduceEdit(current, edit),
      base,
    );
  }

  size(): number {
    return this.head;
  }
}
