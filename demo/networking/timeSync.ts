/**
 * The time-sync lesson (REQ-434): how NTP works out a clock's offset from the
 * four timestamps of one exchange (RFC 5905, section 8), why an asymmetric
 * path leaves an error it cannot see, and how PTP (IEEE 1588) with hardware
 * timestamps and a transparent clock removes the error of switch queues.
 *
 * Simplified: one exchange, no filtering or clock discipline over many
 * exchanges; clocks do not drift during an exchange; timestamps are exact
 * (real hardware timestamps have a resolution of a few nanoseconds); PTP is
 * shown with the end-to-end delay request-response mechanism through one
 * switch, and its offset uses the same arithmetic as NTP's.
 */

/** The four timestamps of one exchange, each read on the clock that took it. */
export interface Timestamps {
  /** Client sends the request (client clock). */
  readonly t1: number;
  /** Server receives it (server clock). */
  readonly t2: number;
  /** Server sends the reply (server clock). */
  readonly t3: number;
  /** Client receives the reply (client clock). */
  readonly t4: number;
}

export interface Estimate {
  /** θ: how far the server's clock is ahead of the client's. */
  readonly offset: number;
  /** δ: the round trip, without the time the server held the request. */
  readonly delay: number;
}

/** RFC 5905, section 8: θ = ((t2 − t1) + (t3 − t4)) / 2, δ = (t4 − t1) − (t3 − t2). */
export function estimate({ t1, t2, t3, t4 }: Timestamps): Estimate {
  return { offset: (t2 - t1 + (t3 - t4)) / 2, delay: t4 - t1 - (t3 - t2) };
}

export interface Path {
  /** How far the server's clock is really ahead of the client's. */
  readonly trueOffset: number;
  /** One-way time, client to server. */
  readonly forward: number;
  /** One-way time, server to client. */
  readonly backward: number;
  /** How long the server holds the request before replying. */
  readonly hold: number;
  /** When the client sends, on its own clock. */
  readonly t1: number;
}

/** The timestamps one exchange over `path` produces. */
export function exchange(path: Path): Timestamps {
  const t2 = path.t1 + path.forward + path.trueOffset;
  const t3 = t2 + path.hold;
  const t4 = t3 - path.trueOffset + path.backward;
  return { t1: path.t1, t2, t3, t4 };
}

export interface Result extends Estimate {
  readonly timestamps: Timestamps;
  /** Estimated minus true offset: (forward − backward) / 2. */
  readonly error: number;
  /** The most the error can be for this measured delay, whatever the split: δ / 2. */
  readonly bound: number;
}

export function measure(path: Path): Result {
  const timestamps = exchange(path);
  const found = estimate(timestamps);
  return {
    ...found,
    timestamps,
    error: found.offset - path.trueOffset,
    bound: found.delay / 2,
  };
}

/** The first scene, in ms: the server is 25 ms ahead and the path is even. */
export const SYMMETRIC: Path = { trueOffset: 25, forward: 10, backward: 10, hold: 5, t1: 1000 };

/** The second scene, in ms: the same clocks, but 14 ms out and 4 ms back. */
export const ASYMMETRIC: Path = { trueOffset: 25, forward: 14, backward: 4, hold: 5, t1: 1000 };

/** The scene's path with another forward one-way time (the slider). */
export function withForward(forward: number): Path {
  return { ...ASYMMETRIC, forward };
}

/**
 * PTP, in nanoseconds, through one switch. Sync goes master → slave and
 * Delay_Req slave → master; each waits in the switch's queue for a different
 * time. A transparent clock measures each message's residence time and adds it
 * to the message's correctionField, and the slave subtracts it.
 */
export interface PtpPath {
  readonly trueOffsetNs: number;
  /** Propagation on the fibres, master to slave and back (switch excluded). */
  readonly linkForwardNs: number;
  readonly linkBackwardNs: number;
  /** Residence time in the switch: Sync and Delay_Req. */
  readonly syncWaitNs: number;
  readonly delayReqWaitNs: number;
}

export type Switch = 'ordinary' | 'transparent';

export interface PtpResult {
  /** Estimated minus true offset, ns. */
  readonly errorNs: number;
  /** The mean path delay the slave computes, ns. */
  readonly meanPathDelayNs: number;
}

export function ptp(path: PtpPath, kind: Switch): PtpResult {
  const correct = kind === 'transparent';
  // The forward and backward times the slave's arithmetic ends up using.
  const forward = path.linkForwardNs + path.syncWaitNs - (correct ? path.syncWaitNs : 0);
  const backward = path.linkBackwardNs + path.delayReqWaitNs - (correct ? path.delayReqWaitNs : 0);
  // Same timestamps as NTP, named as IEEE 1588 names them.
  const result = measure({
    trueOffset: path.trueOffsetNs,
    forward,
    backward,
    hold: 0,
    t1: 0,
  });
  return { errorNs: result.error, meanPathDelayNs: result.delay / 2 };
}

/** The PTP scene: Sync waits 400 µs, Delay_Req 20 µs; the fibres take 5.0 µs out and 5.1 µs back. */
export const PTP_SCENE: PtpPath = {
  trueOffsetNs: 3_000,
  linkForwardNs: 5_000,
  linkBackwardNs: 5_100,
  syncWaitNs: 400_000,
  delayReqWaitNs: 20_000,
};

export function withSyncWait(syncWaitNs: number): PtpPath {
  return { ...PTP_SCENE, syncWaitNs };
}
