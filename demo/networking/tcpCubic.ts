/**
 * The modern congestion control lesson (REQ-436): how long a sender needs to
 * get its window back after one loss on a long, fast path, with Reno and with
 * CUBIC, and how RACK-TLP repairs a lost tail without waiting for an RTO.
 *
 * Reno (RFC 5681): after fast recovery the window is half of what was in
 * flight, then grows by one segment per round trip.
 *
 * CUBIC (RFC 9438): the window drops to β_cubic = 0.7 of W_max and then
 * follows W_cubic(t) = C·(t − K)³ + W_max with C = 0.4, t in seconds since the
 * loss and K = ∛(W_max·(1 − β_cubic)/C). It never goes below the Reno-friendly
 * estimate W_est(t) = W_max·β_cubic + α_cubic·t/RTT with
 * α_cubic = 3·(1 − β_cubic)/(1 + β_cubic).
 *
 * RACK-TLP (RFC 8985): when nothing is acknowledged for a probe timeout
 * PTO = 2·SRTT (plus WCDelAckT = 200 ms when only one segment is in flight,
 * and never more than the RTO), the sender resends its last segment; the
 * acknowledgement of that probe lets RACK mark the earlier holes lost at once.
 * Without it the sender waits for the retransmission timeout, at least 1 s by
 * RFC 6298, and then restarts from a window of one segment (RFC 5681).
 *
 * Simplified: windows are counted in whole 1500-byte packets; there is one
 * flow, one loss, no fast convergence and no slow start; in the tail-loss part
 * the flight is sent in one burst, every surviving segment's ACK arrives one
 * SRTT later (both timers restart then), RTTVAR is taken as SRTT/4, and clock
 * granularity is ignored.
 */

export const PACKET_BYTES = 1500;
/** RFC 9438 constants. */
export const BETA_CUBIC = 0.7;
export const C_CUBIC = 0.4;
export const ALPHA_CUBIC = (3 * (1 - BETA_CUBIC)) / (1 + BETA_CUBIC);

/** The window, in packets, that keeps a path of `bps` and `rttMs` full. */
export function windowPackets(bps: number, rttMs: number): number {
  return Math.round((bps * rttMs) / 1000 / 8 / PACKET_BYTES);
}

/** CUBIC's K, seconds: when W_cubic returns to W_max. */
export function cubicK(wMax: number): number {
  return Math.cbrt((wMax * (1 - BETA_CUBIC)) / C_CUBIC);
}

/** Reno's window `tS` seconds after the loss, packets. */
export function renoWindow(wMax: number, rttMs: number, tS: number): number {
  return Math.min(wMax, wMax / 2 + (tS * 1000) / rttMs);
}

/** CUBIC's window `tS` seconds after the loss, packets: the larger of the cubic curve and W_est. */
export function cubicWindow(wMax: number, rttMs: number, tS: number): number {
  const cubic = C_CUBIC * (tS - cubicK(wMax)) ** 3 + wMax;
  const est = wMax * BETA_CUBIC + (ALPHA_CUBIC * tS * 1000) / rttMs;
  return Math.max(cubic, est);
}

export interface Recovery {
  /** Window just before the loss, packets. */
  readonly wMax: number;
  /** Window right after the loss, packets. */
  readonly after: number;
  /** Seconds until the window is back at W_max. */
  readonly seconds: number;
}

/** Reno after one loss: halve, then one packet per round trip. */
export function renoRecovery(wMax: number, rttMs: number): Recovery {
  const after = wMax / 2;
  return { wMax, after, seconds: ((wMax - after) * rttMs) / 1000 };
}

/** CUBIC after one loss: down to 0.7·W_max, back at K (or sooner if W_est gets there first). */
export function cubicRecovery(wMax: number, rttMs: number): Recovery {
  const after = wMax * BETA_CUBIC;
  const estSeconds = (((wMax - after) / ALPHA_CUBIC) * rttMs) / 1000;
  return { wMax, after, seconds: Math.min(cubicK(wMax), estSeconds) };
}

/** Points of both windows from the loss to `untilS`, for the chart. */
export function curves(
  wMax: number,
  rttMs: number,
  untilS: number,
  steps = 60,
): readonly { readonly t: number; readonly reno: number; readonly cubic: number }[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (untilS * i) / steps;
    return { t, reno: renoWindow(wMax, rttMs, t), cubic: cubicWindow(wMax, rttMs, t) };
  });
}

/** RFC 6298 (2.4): the RTO SHOULD be rounded up to 1 s. */
export const MIN_RTO_MS = 1000;
/** RFC 8985: the worst-case delayed-ACK time added to the PTO for a single segment in flight. */
export const WC_DEL_ACK_MS = 200;
export const FLIGHT = 10;

export interface Repair {
  /** ms after the burst was sent until the first lost segment is sent again. */
  readonly firstResendMs: number;
  /** ms until every lost segment has been sent again. */
  readonly allResentMs: number;
  /** The window, packets, the sender continues with. */
  readonly windowAfter: number;
}

export interface TailLoss {
  readonly rtoMs: number;
  readonly ptoMs: number;
  readonly tlp: Repair;
  readonly rtoOnly: Repair;
}

/** The last `lost` of a burst of FLIGHT segments are lost; how each sender repairs them. */
export function tailLoss(srttMs: number, lost: number): TailLoss {
  const rttvar = srttMs / 4;
  const rtoMs = Math.max(MIN_RTO_MS, srttMs + 4 * rttvar);
  const ptoMs = Math.min(2 * srttMs + (lost === 1 ? WC_DEL_ACK_MS : 0), rtoMs);
  // Every surviving segment is acknowledged one SRTT after the burst; both timers restart then.
  const lastAckMs = srttMs;
  const probeMs = lastAckMs + ptoMs;
  const tlp: Repair = {
    firstResendMs: probeMs,
    // The probe resends the last segment; its SACK, one SRTT later, exposes the other holes.
    allResentMs: lost === 1 ? probeMs : probeMs + srttMs,
    windowAfter: Math.floor(FLIGHT * BETA_CUBIC),
  };
  const timeoutMs = lastAckMs + rtoMs;
  // After an RTO the window is one segment and doubles each round trip.
  const rounds = Math.ceil(Math.log2(lost + 1));
  const rtoOnly: Repair = {
    firstResendMs: timeoutMs,
    allResentMs: timeoutMs + (rounds - 1) * srttMs,
    windowAfter: 1,
  };
  return { rtoMs, ptoMs, tlp, rtoOnly };
}
