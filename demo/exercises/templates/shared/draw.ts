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

/** `items` in an order the seed decides (Fisher–Yates over the next draws). */
export function shuffled<T>(draw: Draw, items: readonly T[]): T[] {
  const order = [...items];
  for (let last = order.length - 1; last > 0; last -= 1) {
    const pick = draw.int(last + 1);
    const held = order[last] as T;
    order[last] = order[pick] as T;
    order[pick] = held;
  }
  return order;
}

/**
 * A place from 0 to `count - 1` that every place gets equally often: seeds are
 * taken `count` at a time, and each such run uses every place once, in an
 * order of its own. So over a pool no place is favoured, and the place does
 * not simply step along with the seed.
 *
 * Used for whatever must not give the answer away by where it stands: the
 * option that works among the options, the faulty device among its neighbours.
 * `salt` gives each template an order of its own: without it every template
 * would put its answer in the same place for the same seed, and the first
 * instance of each (seed 0, the one a placement shows) would all agree.
 */
export function evenPlace(seed: number, count: number, salt = 0): number {
  if (count <= 1) return 0;
  const run = Math.floor(seed / count);
  const places = Array.from({ length: count }, (_, place) => place);
  for (let last = count - 1; last > 0; last -= 1) {
    // Sequence numbers far above any a template draws, so the two never meet.
    const roll = drawAt(run, 1_000_000 + salt * 1000 + last);
    const pick = Math.min(Math.floor(roll * (last + 1)), last);
    const held = places[last] as number;
    places[last] = places[pick] as number;
    places[pick] = held;
  }
  return places[seed % count] ?? 0;
}

/** `rest` in the seed's order, with `chosen` at a place every place gets equally often. */
export function placedEvenly<T>(
  draw: Draw,
  seed: number,
  salt: number,
  chosen: T,
  rest: readonly T[],
): T[] {
  const order = shuffled(draw, rest);
  order.splice(evenPlace(seed, rest.length + 1, salt), 0, chosen);
  return order;
}
