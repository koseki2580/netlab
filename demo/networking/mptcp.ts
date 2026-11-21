/**
 * The Multipath TCP lesson (REQ-414): one connection over several paths
 * (MPTCP v1, RFC 8684), the scheduler that picks a path for each segment,
 * and coupled congestion control (LIA, RFC 6356).
 *
 * Simplified:
 * - Part 1 is a fluid model. Each subflow carries data at its path's
 *   capacity from the first moment; slow start, handshakes and the last
 *   round trip are ignored. A min-RTT scheduler gives each new segment to the
 *   lowest-RTT subflow that has room in its window, so both paths stay full
 *   and the download goes at the sum of the two capacities.
 * - When Wi-Fi is lost the phone notices at once (the interface goes down).
 *   The few round trips of data that were in flight on Wi-Fi and are sent
 *   again on LTE are ignored.
 * - Part 2 uses the standard loss-based equilibrium: under loss rate p a TCP
 *   window settles at sqrt(2/p) segments. Every flow crossing the one
 *   bottleneck sees the same p and the same RTT. An uncoupled subflow is a
 *   TCP flow of its own; LIA links the subflows' increases so that, together,
 *   they settle at the window one TCP flow would have.
 * - 1 MB = 10^6 bytes, 1 Mbit = 10^6 bits.
 */

export interface Path {
  readonly id: 'wifi' | 'lte';
  readonly mbps: number;
  readonly rttMs: number;
}

export const WIFI: Path = { id: 'wifi', mbps: 40, rttMs: 20 };
export const LTE: Path = { id: 'lte', mbps: 20, rttMs: 60 };
export const PATHS: readonly Path[] = [WIFI, LTE];
export const FILE_MB = 50;

const megabits = (mb: number) => mb * 8;
const megabytes = (mbit: number) => mbit / 8;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** The bytes a path's window holds when the path is full: its bandwidth × RTT, in KB. */
export function windowKb(path: Path): number {
  return (path.mbps * 1000 * path.rttMs) / 8 / 1000;
}

/**
 * Where a min-RTT scheduler puts `kb` of data the app hands it at once, while
 * every window is empty: the lowest-RTT subflow first, then the next.
 */
export function schedule(
  kb: number,
  paths: readonly Path[] = PATHS,
): Readonly<Record<Path['id'], number>> {
  const out: Record<Path['id'], number> = { wifi: 0, lte: 0 };
  let left = kb;
  for (const path of [...paths].sort((a, b) => a.rttMs - b.rttMs)) {
    const take = Math.min(left, windowKb(path));
    out[path.id] = take;
    left -= take;
  }
  return out;
}

export interface Download {
  /** Seconds until the whole file has arrived. */
  readonly seconds: number;
  /** MB each path carried. */
  readonly carriedMb: Readonly<Record<Path['id'], number>>;
}

/** A download of `fileMb` over every path in `paths`, all of them full. */
export function download(paths: readonly Path[], fileMb = FILE_MB): Download {
  const total = paths.reduce((sum, path) => sum + path.mbps, 0);
  const seconds = megabits(fileMb) / total;
  const carriedMb: Record<Path['id'], number> = { wifi: 0, lte: 0 };
  for (const path of paths) carriedMb[path.id] = round2(megabytes(path.mbps * seconds));
  return { seconds: round2(seconds), carriedMb };
}

/** How the handshake ends: MPTCP only if MP_CAPABLE survived in both SYN and SYN/ACK. */
export function handshake(mpCapableArrives: boolean): {
  readonly mode: 'mptcp' | 'tcp';
  readonly extraSubflows: boolean;
} {
  return mpCapableArrives
    ? { mode: 'mptcp', extraSubflows: true }
    : { mode: 'tcp', extraSubflows: false };
}

export interface Failover {
  readonly mode: 'mptcp' | 'tcp';
  /** Did the whole file arrive? */
  readonly finished: boolean;
  /** MB received when Wi-Fi was lost (or the whole file, if it was already done). */
  readonly mbAtLoss: number;
  /** When the download finished, s; null when it broke. */
  readonly finishSeconds: number | null;
  /** Seconds the rest took after Wi-Fi was lost; null when it broke or was already done. */
  readonly afterLossSeconds: number | null;
  /** Rate before and after the loss, Mbit/s. */
  readonly mbpsBefore: number;
  readonly mbpsAfter: number;
}

/**
 * Wi-Fi goes away `lossAtS` seconds into the download. Plain TCP over Wi-Fi
 * is bound to Wi-Fi's address, so the connection breaks. MPTCP keeps the
 * connection and goes on over its LTE subflow — unless a middlebox stripped
 * MP_CAPABLE, in which case it fell back to plain TCP over Wi-Fi.
 */
export function failover(
  protocol: 'tcp' | 'mptcp',
  lossAtS: number,
  mpCapableArrives = true,
  fileMb = FILE_MB,
): Failover {
  const mode = protocol === 'mptcp' ? handshake(mpCapableArrives).mode : 'tcp';
  const before = mode === 'mptcp' ? PATHS : [WIFI];
  const after = mode === 'mptcp' ? [LTE] : [];
  const mbpsBefore = before.reduce((sum, path) => sum + path.mbps, 0);
  const mbpsAfter = after.reduce((sum, path) => sum + path.mbps, 0);
  const doneAt = megabits(fileMb) / mbpsBefore;
  if (doneAt <= lossAtS) {
    return {
      mode,
      finished: true,
      mbAtLoss: fileMb,
      finishSeconds: round2(doneAt),
      afterLossSeconds: null,
      mbpsBefore,
      mbpsAfter,
    };
  }
  const mbAtLoss = megabytes(mbpsBefore * lossAtS);
  if (mbpsAfter === 0) {
    return {
      mode,
      finished: false,
      mbAtLoss: round2(mbAtLoss),
      finishSeconds: null,
      afterLossSeconds: null,
      mbpsBefore,
      mbpsAfter,
    };
  }
  const rest = megabits(fileMb - mbAtLoss) / mbpsAfter;
  return {
    mode,
    finished: true,
    mbAtLoss: round2(mbAtLoss),
    finishSeconds: round2(lossAtS + rest),
    afterLossSeconds: round2(rest),
    mbpsBefore,
    mbpsAfter,
  };
}

/** The shared bottleneck of part 2. */
export const BOTTLENECK = { mbps: 30, rttMs: 40, mssBytes: 1460 } as const;

/** The window a TCP flow settles at under loss rate p, in segments. */
export function tcpWindow(p: number): number {
  return Math.sqrt(2 / p);
}

export interface Shares {
  /** The loss rate at which the flows exactly fill the bottleneck. */
  readonly lossRate: number;
  /** Mbit/s the MPTCP connection gets, all its subflows together. */
  readonly mptcpMbps: number;
  /** Mbit/s the regular TCP flow gets. */
  readonly tcpMbps: number;
  /** MPTCP's share of the bottleneck, %. */
  readonly mptcpPct: number;
  /** MPTCP's window, all subflows together, in segments. */
  readonly mptcpWindow: number;
  /** The regular TCP flow's window, in segments. */
  readonly tcpWindow: number;
}

/**
 * `subflows` MPTCP subflows and one regular TCP flow share one bottleneck.
 * Uncoupled, each subflow settles at a full TCP window. Coupled (LIA), the
 * subflows together settle at one TCP window.
 */
export function bottleneckShares(subflows: number, coupled: boolean): Shares {
  const { mbps, rttMs, mssBytes } = BOTTLENECK;
  const mbpsPerWindow = (mssBytes * 8) / 1e6 / (rttMs / 1000);
  const tcpEquivalents = (coupled ? 1 : subflows) + 1;
  // tcpEquivalents × sqrt(2/p) × mbpsPerWindow = capacity → solve for p.
  const windowEach = mbps / mbpsPerWindow / tcpEquivalents;
  const lossRate = 2 / (windowEach * windowEach);
  const one = tcpWindow(lossRate);
  const mptcpWindow = coupled ? one : subflows * one;
  const mptcpMbps = mptcpWindow * mbpsPerWindow;
  const tcpMbps = one * mbpsPerWindow;
  return {
    lossRate,
    mptcpMbps: round2(mptcpMbps),
    tcpMbps: round2(tcpMbps),
    mptcpPct: Math.round((mptcpMbps / mbps) * 100),
    mptcpWindow: Math.round(mptcpWindow),
    tcpWindow: Math.round(one),
  };
}
