import type { SimulationSnapshot } from './types';
import type { Edit } from './edits';
import { reduceEdit } from './edits';

export class EditSession {
  readonly edits: readonly Edit[];

  constructor(edits: readonly Edit[] = []) {
    this.edits = Object.freeze([...edits]);
    Object.freeze(this);
  }

  static empty(): EditSession {
    return new EditSession();
  }

  push(edit: Edit): EditSession {
    return new EditSession([...this.edits, edit]);
  }

  apply(base: SimulationSnapshot): SimulationSnapshot {
    return this.edits.reduce<SimulationSnapshot>(
      (current, edit: unknown) => reduceEdit(current, edit),
      base,
    );
  }

  size(): number {
    return this.edits.length;
  }
}
