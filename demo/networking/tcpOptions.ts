/**
 * The TCP options lesson (REQ-409): the two options that decide how fast TCP
 * can go on a long, fast path.
 *
 * Window scaling (RFC 7323): a sender may have at most one window of
 * unacknowledged data in flight, so throughput ≤ window / RTT. The window
 * field is 16 bits (at most 65,535 bytes); the window scale option, sent in
 * the SYN and SYN-ACK, shifts it left by 0..14 bits. It is used only if both
 * ends sent it.
 *
 * SACK (RFC 2018): the receiver reports the blocks it holds above the
 * cumulative ACK, so the sender learns every hole of a window at once.
 *
 * Simplified: no loss or competing traffic in part 1, and the congestion
 * window never limits the sender; in part 2, "without SACK" is NewReno
 * (RFC 6582: one lost segment repaired per round trip), "with SACK" resends
 * every hole in the first round trip of recovery (the congestion window is
 * taken as large enough), and segments are numbered instead of using byte
 * sequence numbers.
 */

/** The largest value of the 16-bit window field, bytes. */
export const MAX_UNSCALED_WINDOW = 65_535;
/** RFC 7323 caps the shift at 14. */
export const MAX_SHIFT = 14;
export const LINK_BPS = 1_000_000_000;
export const RTTS_MS: readonly number[] = [10, 50, 150];
export const FAR_RTT_MS = 150;

/** The most a sender with `windowBytes` in flight can deliver, bits per second. */
export function throughputBps(windowBytes: number, rttMs: number): number {
  return (windowBytes * 8 * 1000) / rttMs;
}

/** The bytes in flight needed to keep a path of `bps` and `rttMs` full. */
export function bdpBytes(bps: number, rttMs: number): number {
  return (bps * rttMs) / 1000 / 8;
}

/** The largest window a shift allows, bytes. */
export function scaledWindow(shift: number): number {
  return MAX_UNSCALED_WINDOW * 2 ** shift;
}

/** The smallest shift with 65,535 << shift ≥ `bytes`, or null if even 14 is not enough. */
export function minShift(bytes: number): number | null {
  for (let shift = 0; shift <= MAX_SHIFT; shift++) {
    if (scaledWindow(shift) >= bytes) return shift;
  }
  return null;
}

/** Scaling is used only if the option is in both the SYN and the SYN-ACK. */
export function scalingInUse(inSyn: boolean, inSynAck: boolean): boolean {
  return inSyn && inSynAck;
}

export interface PathResult {
  readonly bdpBytes: number;
  readonly shiftNeeded: number | null;
  readonly windowBytes: number;
  readonly throughputBps: number;
  /** Throughput over link speed, 0..1. */
  readonly utilisation: number;
}

/**
 * A transfer over a path of `linkBps` and `rttMs`. The receiver offers the
 * shift that fills the path; if a middlebox strips the option from the SYN,
 * the server never sees it, does not echo it, and scaling is off.
 */
export function transfer(
  linkBps: number,
  rttMs: number,
  options: { readonly offered: boolean; readonly stripped: boolean },
): PathResult {
  const bdp = bdpBytes(linkBps, rttMs);
  const shiftNeeded = minShift(bdp);
  const inSyn = options.offered && !options.stripped;
  // The server may put the option in its SYN-ACK only if it was in the SYN.
  const inSynAck = inSyn;
  const inUse = scalingInUse(inSyn, inSynAck);
  const windowBytes = inUse ? scaledWindow(shiftNeeded ?? MAX_SHIFT) : MAX_UNSCALED_WINDOW;
  const rate = Math.min(linkBps, throughputBps(windowBytes, rttMs));
  return {
    bdpBytes: bdp,
    shiftNeeded,
    windowBytes,
    throughputBps: rate,
    utilisation: rate / linkBps,
  };
}

/* ---------------------------------------------------------------- SACK */

export const WINDOW_SEGMENTS = 20;
export const DEFAULT_LOST: readonly number[] = [5, 9, 14];

/** A SACK block in segment numbers: left edge is the first segment held, right edge the one after the last. */
export interface SackBlock {
  readonly left: number;
  readonly right: number;
}

/** TCP options space is 40 bytes; SACK takes 2 + 8 per block; timestamps take 10 (12 with padding). */
export function maxSackBlocks(timestamps: boolean): number {
  return Math.floor((40 - (timestamps ? 12 : 0) - 2) / 8);
}

/** The next segment the receiver expects: the cumulative ACK. */
export function cumulativeAck(windowSegments: number, lost: readonly number[]): number {
  for (let seg = 1; seg <= windowSegments; seg++) {
    if (lost.includes(seg)) return seg;
  }
  return windowSegments + 1;
}

/**
 * The SACK blocks in the receiver's ACK after the whole window has arrived,
 * most recently received first (RFC 2018 §4), capped at `maxBlocks`.
 */
export function sackBlocks(
  windowSegments: number,
  lost: readonly number[],
  maxBlocks: number,
): SackBlock[] {
  const ack = cumulativeAck(windowSegments, lost);
  const blocks: SackBlock[] = [];
  let left: number | null = null;
  for (let seg = ack; seg <= windowSegments + 1; seg++) {
    const held = seg <= windowSegments && !lost.includes(seg);
    if (held && left === null) left = seg;
    if (!held && left !== null) {
      blocks.push({ left, right: seg });
      left = null;
    }
  }
  return blocks.reverse().slice(0, maxBlocks);
}

export interface Recovery {
  /** Round trips from the first retransmission until every hole is filled. */
  readonly roundTrips: number;
  /** The segments resent in each round trip. */
  readonly perRound: readonly (readonly number[])[];
}

/**
 * Recovery of one window's losses after fast retransmit. NewReno learns the
 * next hole only from the partial ACK of the previous retransmission; SACK
 * knows them all and resends them together.
 */
export function recovery(lost: readonly number[], sack: boolean): Recovery {
  const sorted = [...lost].sort((a, b) => a - b);
  if (sorted.length === 0) return { roundTrips: 0, perRound: [] };
  const perRound = sack ? [sorted] : sorted.map((seg) => [seg]);
  return { roundTrips: perRound.length, perRound };
}
