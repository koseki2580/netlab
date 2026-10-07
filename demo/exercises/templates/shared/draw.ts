/**
 * Everything an exercise varies comes from its seed through `drawAt`. Each
 * call takes the next position in the sequence, so a template reads top to
 * bottom as "what is drawn from the seed".
 */

import { drawAt } from '../../../../src/utils/prng';

export interface Draw {
  /** One of `items`. */
  pick<const A extends readonly [unknown, ...unknown[]]>(items: A): A[number];
  /** A whole number from 0 to `below - 1`. */
  int(below: number): number;
}

export function drawer(seed: number): Draw {
  let seq = 0;
  const int = (below: number): number => {
    const value = Math.floor(drawAt(seed, seq) * below);
    seq += 1;
    return Math.min(value, below - 1);
  };
  return {
    int,
    pick: (items) => items[int(items.length)] ?? items[0],
  };
}
