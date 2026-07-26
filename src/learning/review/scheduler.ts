/**
 * A small Leitner-style spaced-repetition scheduler — the learning-science core
 * that turns one-shot concept checks into durable knowledge. Each reviewable
 * item lives in a "box"; a correct answer promotes it (longer interval before
 * it is due again), a wrong answer sends it back to box 1. Pure and
 * deterministic over an injected `now`, so it is fully unit-testable.
 */

export const MAX_BOX = 5;

const DAY = 86_400_000;
/** Time until an item in a given box is due again, indexed by box (1..MAX_BOX). */
export const BOX_INTERVAL_MS: readonly number[] = [
  0, // box 0 — unused (a never-seen item)
  10 * 60_000, // box 1: 10 minutes (just missed → come back soon)
  DAY, // box 2: 1 day
  3 * DAY, // box 3: 3 days
  7 * DAY, // box 4: 1 week
  21 * DAY, // box 5: 3 weeks (mastered cadence)
];

export interface ReviewEntry {
  /** Leitner box, 1..MAX_BOX. */
  readonly box: number;
  /** Epoch ms when this item is next due for review. */
  readonly dueAt: number;
}

export type ReviewState = Readonly<Record<string, ReviewEntry>>;

function intervalFor(box: number): number {
  return BOX_INTERVAL_MS[Math.max(1, Math.min(MAX_BOX, box))] ?? DAY;
}

/**
 * Record an answer for `itemId`: a correct answer promotes one box (capped at
 * MAX_BOX), a wrong answer resets to box 1. Returns a new state.
 */
export function gradeReview(
  state: ReviewState,
  itemId: string,
  correct: boolean,
  now: number,
): ReviewState {
  const prevBox = state[itemId]?.box ?? 0;
  const box = correct ? Math.min(prevBox + 1, MAX_BOX) : 1;
  return { ...state, [itemId]: { box, dueAt: now + intervalFor(box) } };
}

/** A seen item is due when its scheduled time has arrived. */
export function isDue(state: ReviewState, itemId: string, now: number): boolean {
  const entry = state[itemId];
  return entry !== undefined && entry.dueAt <= now;
}

/** A seen item is "mastered" once it reaches the top box. */
export function isMastered(state: ReviewState, itemId: string): boolean {
  return (state[itemId]?.box ?? 0) >= MAX_BOX;
}

/**
 * The review queue: seen-but-not-yet-mastered items, capped at `limit`.
 *
 * With `now`, items the scheduler says are actually due come first — otherwise a
 * backlog of just-missed box-1 items (never due yet) would fill every session and
 * genuinely overdue items in higher boxes could starve forever. Within each group
 * the order is weakest-then-most-overdue (lowest box, then earliest due).
 */
export function reviewQueue(state: ReviewState, limit = Infinity, now?: number): string[] {
  const isDueNow = ([, entry]: [string, ReviewEntry]) => now !== undefined && entry.dueAt <= now;
  return Object.entries(state)
    .filter(([, entry]) => entry.box < MAX_BOX)
    .sort(
      (a, b) =>
        Number(isDueNow(b)) - Number(isDueNow(a)) || a[1].box - b[1].box || a[1].dueAt - b[1].dueAt,
    )
    .slice(0, limit === Infinity ? undefined : limit)
    .map(([id]) => id);
}

export interface ReviewStats {
  /** Items answered at least once. */
  readonly seen: number;
  /** Items at the top box. */
  readonly mastered: number;
  /** Seen items whose scheduled review time has arrived. */
  readonly due: number;
  /** Seen items not yet at the top box (the review pool). */
  readonly inReview: number;
  /** Review-pool items whose scheduled time has arrived — the actionable "due now". */
  readonly dueInReview: number;
}

export function reviewStats(state: ReviewState, now: number): ReviewStats {
  const entries = Object.values(state);
  return {
    seen: entries.length,
    mastered: entries.filter((entry) => entry.box >= MAX_BOX).length,
    due: entries.filter((entry) => entry.dueAt <= now).length,
    inReview: entries.filter((entry) => entry.box < MAX_BOX).length,
    dueInReview: entries.filter((entry) => entry.box < MAX_BOX && entry.dueAt <= now).length,
  };
}
