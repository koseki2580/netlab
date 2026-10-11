/**
 * The order of what is offered, per attempt.
 *
 * Chips and options used to be ordered by the exercise's seed, and the first
 * instance of every template shares a seed: "press the last one" and "press
 * what worked last time" passed. The order now belongs to the attempt. It is
 * worked out from the attempts the learner has made so far, so it needs no
 * storage of its own and a test can fix it by fixing the attempt ids.
 *
 * Every attempt moves a `slot` on by a step that shares no factor with 2, 3
 * or 5. The place of the right answer among `count` things is `slot % count`,
 * so for any count up to six it is never the place it had in the attempt
 * before, whatever that attempt offered.
 */

/** Steps that share no factor with 60 (= the least common multiple of 1 to 6). */
const STEPS = [1, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59] as const;
const CYCLE = 60;

export interface AttemptOrder {
  /** Seeds the shuffle of whatever is not the right answer. */
  readonly seed: number;
  /** 0 to 59. See `placeIn`. */
  readonly slot: number;
}

/** FNV-1a over the text, as an unsigned 32-bit number. */
export function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  }
  // One more round, so that ids differing only in their last digit spread out.
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  return hash >>> 0;
}

const stepOf = (id: string): number => STEPS[hashText(id) % STEPS.length] ?? 1;

/**
 * The order for the attempt `attemptId`, given the ids of every attempt so far
 * (oldest first, `attemptId` among them or not). `resets` is how often the
 * learner put the exercise back to its start in this attempt: each one moves
 * the slot on again.
 */
export function attemptOrder(
  attemptIds: readonly string[],
  attemptId: string,
  resets = 0,
): AttemptOrder {
  const upTo = attemptIds.indexOf(attemptId);
  const before = upTo === -1 ? attemptIds : attemptIds.slice(0, upTo);
  let slot = 0;
  for (const id of [...before, attemptId]) slot = (slot + stepOf(id)) % CYCLE;
  for (let reset = 1; reset <= resets; reset += 1) {
    slot = (slot + stepOf(`${attemptId}#reset${reset}`)) % CYCLE;
  }
  return { seed: hashText(`${attemptId}#${resets}`), slot };
}

/** An order for where there is no attempt (a preview, a test): fixed. */
export const FIRST_ORDER: AttemptOrder = { seed: 1, slot: 0 };

/** The place of the right answer among `count` things. */
export function placeIn(order: AttemptOrder, count: number): number {
  return count <= 1 ? 0 : order.slot % count;
}

/** A small seeded generator (mulberry32): the same seed, the same numbers. */
export function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const order = [...items];
  for (let last = order.length - 1; last > 0; last -= 1) {
    const pick = Math.floor(random() * (last + 1));
    const held = order[last] as T;
    order[last] = order[pick] as T;
    order[pick] = held;
  }
  return order;
}

/** `wrong` shuffled by the attempt, with `right` at the attempt's place. `salt` tells cards apart. */
export function inAttemptOrder<T>(
  right: T,
  wrong: readonly T[],
  order: AttemptOrder,
  salt = '',
): T[] {
  const items = shuffled(wrong, generator(order.seed ^ hashText(salt)));
  items.splice(placeIn(order, wrong.length + 1), 0, right);
  return items;
}
