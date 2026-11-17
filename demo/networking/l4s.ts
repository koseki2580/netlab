/**
 * The L4S lesson (REQ-377): one bottleneck shared round by round (one round is
 * the base RTT) by a sender that grows its window by a few packets a round.
 * A classic sender halves on a drop, so its buffer decides the trade-off:
 * deep keeps the line full but delay high, shallow keeps delay low but leaves
 * the line idle. An L4S sender is told early, by ECN marks from a shallow
 * threshold, and backs off in proportion to them (as DCTCP/Prague do), so the
 * queue stays short and the line stays full.
 */
export type L4sScenario = 'classic-deep' | 'classic-shallow' | 'l4s';

export const SCENARIOS: readonly L4sScenario[] = ['classic-deep', 'classic-shallow', 'l4s'];

/** Packets the bottleneck sends per round. */
export const CAPACITY = 100;
/** The base round-trip time, ms: a queue of CAPACITY packets adds one more. */
export const BASE_RTT_MS = 20;
/** Packets the window grows by each round. */
export const INCREASE = 5;
/** The queue above which an L4S router marks instead of waiting to drop. */
export const MARK_THRESHOLD = 5;
export const ROUNDS = 120;

const BUFFER: Record<L4sScenario, number> = {
  'classic-deep': 100,
  'classic-shallow': 20,
  l4s: 100,
};

export interface Round {
  readonly window: number;
  /** Packets waiting at the end of the round. */
  readonly queue: number;
  readonly delayMs: number;
  /** Share of the line used this round, 0–1. */
  readonly used: number;
  readonly dropped: number;
  readonly marked: number;
}

export interface Outcome {
  readonly rounds: readonly Round[];
  readonly averageDelayMs: number;
  readonly maxDelayMs: number;
  /** Share of the line used over the run, %. */
  readonly utilisationPct: number;
  readonly drops: number;
  readonly marks: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export function simulate(scenario: L4sScenario): Outcome {
  const buffer = BUFFER[scenario];
  let window = CAPACITY;
  let queue = 0;
  const rounds: Round[] = [];
  for (let index = 0; index < ROUNDS; index++) {
    const offered = queue + window;
    const used = Math.min(1, offered / CAPACITY);
    let next = Math.max(0, offered - CAPACITY);
    let dropped = 0;
    let marked = 0;
    if (next > buffer) {
      dropped = next - buffer;
      next = buffer;
    }
    if (scenario === 'l4s') {
      // Every packet that finds the queue above the threshold is marked CE.
      marked = Math.max(0, next - MARK_THRESHOLD);
      // Back off by half the marked packets: cwnd × (1 − α/2), α = marked / cwnd.
      window = Math.max(1, window + INCREASE - marked / 2);
    } else {
      window = dropped > 0 ? Math.max(1, Math.floor(window / 2)) : window + INCREASE;
    }
    queue = next;
    rounds.push({
      window: round1(window),
      queue: round1(queue),
      delayMs: round1((queue / CAPACITY) * BASE_RTT_MS),
      used,
      dropped,
      marked: round1(marked),
    });
  }
  // The first rounds are the start, not the steady state.
  const steady = rounds.slice(20);
  return {
    rounds,
    averageDelayMs: round1(steady.reduce((sum, r) => sum + r.delayMs, 0) / steady.length),
    maxDelayMs: Math.max(...steady.map((r) => r.delayMs)),
    utilisationPct: round1((steady.reduce((sum, r) => sum + r.used, 0) / steady.length) * 100),
    drops: steady.reduce((sum, r) => sum + r.dropped, 0),
    marks: round1(steady.reduce((sum, r) => sum + r.marked, 0)),
  };
}
