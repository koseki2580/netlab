/**
 * The TSN lesson (REQ-446): why strict priority alone leaves a control frame
 * waiting behind a best-effort frame that is already on the wire, and how the
 * IEEE 802.1Qbv time-aware shaper (a gate control list repeated every cycle,
 * with a guard band before the protected window) bounds its delay; frame
 * preemption (IEEE 802.1Qbu / IEEE 802.3br) shrinks that guard band.
 *
 * What is counted: a frame's time on the wire is its bytes (header, payload
 * and FCS) plus the 8-byte preamble and SFD plus the 12-byte inter-frame gap.
 * The best-effort frame is the largest untagged one, 1500 payload bytes in a
 * 1518-byte frame; the control frame is a minimum 64-byte frame.
 *
 * Simplified: one control frame per cycle and no other critical traffic;
 * propagation and switch processing are left out; the blocking frame is taken
 * to start just before the control frame arrives (an upper bound); under
 * 802.1Qbv the talker is time-synchronised so its frame is queued when its
 * window opens, and every hop's window is aligned with the previous one. The
 * guard band is modelled as an explicit all-closed entry as long as the
 * longest frame that might still be on the wire. The unsplittable piece under
 * preemption is an assumption of 127 bytes; the real figure follows the
 * fragment rules of 802.3br and the MAC.
 */

/** Preamble and start-frame delimiter, bytes. */
export const PREAMBLE_SFD_BYTES = 8;
/** Inter-frame gap, bytes. */
export const IFG_BYTES = 12;
/** The largest untagged frame: 14-byte header + 1500 payload + 4-byte FCS. */
export const BEST_EFFORT_FRAME_BYTES = 1518;
/** The control frame: Ethernet's minimum, 64 bytes. */
export const CONTROL_FRAME_BYTES = 64;
/** Assumed longest piece of a best-effort frame preemption cannot split, bytes. */
export const UNSPLITTABLE_BYTES = 127;
/** The example cycle of the gate control list, ns. */
export const CYCLE_NS = 250_000;

export const RATES_MBPS = [100, 1000, 10_000] as const;
export type RateMbps = (typeof RATES_MBPS)[number];

/** Bytes a frame occupies on the wire, preamble, SFD and gap included. */
export function wireBytes(frameBytes: number): number {
  return frameBytes + PREAMBLE_SFD_BYTES + IFG_BYTES;
}

/** How long a frame holds the link, ns. */
export function frameTimeNs(frameBytes: number, rateMbps: number): number {
  return (wireBytes(frameBytes) * 8 * 1000) / rateMbps;
}

export type Scheme = 'priority' | 'priority-preempt' | 'qbv' | 'qbv-preempt';
export const SCHEMES: readonly Scheme[] = ['priority', 'priority-preempt', 'qbv', 'qbv-preempt'];

export interface Bound {
  readonly scheme: Scheme;
  /** The longest the control frame can wait behind another frame at one hop, ns. */
  readonly blockingNs: number;
  /** The control frame's own time on the wire, ns. */
  readonly ownNs: number;
  /** Worst case from joining the queue to its last bit leaving, one hop, ns. */
  readonly worstPerHopNs: number;
  /** Worst case over every hop, ns. */
  readonly worstNs: number;
  /** Best case over every hop (no wait at all), ns. */
  readonly bestNs: number;
  /** Worst minus best: how much the delay can vary, ns. */
  readonly jitterNs: number;
  /** Time before the window with every best-effort gate closed, ns (0 without 802.1Qbv). */
  readonly guardBandNs: number;
}

/** The worst-case delay of the control frame over `hops` egress ports. */
export function bound(scheme: Scheme, rateMbps: number, hops = 1): Bound {
  const ownNs = frameTimeNs(CONTROL_FRAME_BYTES, rateMbps);
  const fullFrame = frameTimeNs(BEST_EFFORT_FRAME_BYTES, rateMbps);
  const piece = frameTimeNs(UNSPLITTABLE_BYTES, rateMbps);
  const preempt = scheme === 'priority-preempt' || scheme === 'qbv-preempt';
  const scheduled = scheme === 'qbv' || scheme === 'qbv-preempt';
  // Under 802.1Qbv the guard band keeps the link idle when the window opens.
  const blockingNs = scheduled ? 0 : preempt ? piece : fullFrame;
  const guardBandNs = scheduled ? (preempt ? piece : fullFrame) : 0;
  const worstPerHopNs = blockingNs + ownNs;
  return {
    scheme,
    blockingNs,
    ownNs,
    worstPerHopNs,
    worstNs: worstPerHopNs * hops,
    bestNs: ownNs * hops,
    jitterNs: blockingNs * hops,
    guardBandNs,
  };
}

export type Gates = 'critical' | 'best-effort' | 'closed';

export interface GclEntry {
  readonly startNs: number;
  readonly durationNs: number;
  /** Which traffic classes may start a frame during this entry. */
  readonly open: Gates;
}

/** The control frame's window: its own time rounded up to a whole µs. */
export function windowNs(rateMbps: number): number {
  return Math.ceil(frameTimeNs(CONTROL_FRAME_BYTES, rateMbps) / 1000) * 1000;
}

/**
 * One cycle of the gate control list: the protected window, then best effort,
 * then the guard band, after which the cycle repeats and the window opens.
 */
export function gateControlList(rateMbps: number, preempt: boolean): readonly GclEntry[] {
  const window = windowNs(rateMbps);
  const guard = bound(preempt ? 'qbv-preempt' : 'qbv', rateMbps).guardBandNs;
  return [
    { startNs: 0, durationNs: window, open: 'critical' },
    { startNs: window, durationNs: CYCLE_NS - window - guard, open: 'best-effort' },
    { startNs: CYCLE_NS - guard, durationNs: guard, open: 'closed' },
  ];
}

/** The share of each cycle best effort may start frames in, and the share the guard band costs. */
export function cycleShares(
  rateMbps: number,
  preempt: boolean,
): { readonly bestEffort: number; readonly guardBand: number } {
  const entries = gateControlList(rateMbps, preempt);
  const share = (open: Gates) =>
    entries.filter((entry) => entry.open === open).reduce((sum, e) => sum + e.durationNs, 0) /
    CYCLE_NS;
  return { bestEffort: share('best-effort'), guardBand: share('closed') };
}
