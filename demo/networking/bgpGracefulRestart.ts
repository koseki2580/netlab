/**
 * The BGP graceful restart lesson (REQ-445): BGP graceful restart (RFC 4724)
 * and how BFD's C bit (RFC 5880, RFC 5882) decides whether a helper keeps
 * stale routes.
 *
 * R1 restarts. R2, its eBGP neighbour and the helper, sends traffic for R1's
 * prefixes towards R1; in some scenarios R2 also has a less preferred backup
 * path through R3.
 * - Control-plane restart: R1's BGP process restarts but its forwarding table
 *   keeps forwarding. R2 sees the session drop at once (R1's TCP connection is
 *   reset), the session comes back `cpRestartMs` later and R1 sends End-of-RIB
 *   `eorAfterMs` after that.
 * - Whole-router failure: R1 stops forwarding too and never comes back within
 *   the time shown. R2 notices when BFD goes down, or with no BFD when the
 *   hold timer expires.
 * Without graceful restart R2 withdraws R1's routes when it notices. With it
 * R2 keeps them, marked stale, until End-of-RIB, or deletes them when the
 * session is not back within the Restart Time. A BFD session with the C bit
 * set runs independently of the control plane: it stays up through a
 * control-plane restart, and when it does go down the forwarding plane has
 * failed, so the helper does not keep stale routes (RFC 5882 §4.3.2).
 * Simplified: switching to the backup path, and installing routes again, take
 * no time; all routes arrive by End-of-RIB; one prefix stands for all.
 */
export type Failure = 'control-plane' | 'whole-router';
export type Detection = 'none' | 'bfd-c0' | 'bfd-c1';

export interface Scenario {
  readonly gr: boolean;
  readonly failure: Failure;
  readonly detection: Detection;
  readonly backup: boolean;
  /** The Restart Time R1 advertised in its graceful restart capability, ms. */
  readonly restartTimeMs: number;
  /** Control-plane restart: until the session is back up, ms. */
  readonly cpRestartMs: number;
  /** From the session coming up to End-of-RIB, ms. */
  readonly eorAfterMs: number;
  /** BGP hold time, ms. */
  readonly holdTimeMs: number;
  /** BFD detection time (interval × multiplier), ms. */
  readonly bfdDetectMs: number;
}

/**
 * The lesson's values. Restart Time 120 s and hold time 90 s are common
 * vendor defaults (some use a 180 s hold time); BFD is 300 ms × 3.
 */
export const LESSON_DEFAULTS = {
  restartTimeMs: 120_000,
  cpRestartMs: 45_000,
  eorAfterMs: 15_000,
  holdTimeMs: 90_000,
  bfdDetectMs: 900,
} as const;

export function scenario(overrides: Partial<Scenario>): Scenario {
  return {
    gr: false,
    failure: 'control-plane',
    detection: 'none',
    backup: false,
    ...LESSON_DEFAULTS,
    ...overrides,
  };
}

export type RouteState = 'fresh' | 'stale' | 'none';
export type PathUsed = 'r1' | 'backup' | 'none';

export interface Segment {
  readonly fromMs: number;
  readonly toMs: number;
  readonly route: RouteState;
  readonly path: PathUsed;
  readonly flowing: boolean;
}

export type EventKind =
  | 'failure'
  | 'noticed'
  | 'stale-kept'
  | 'withdrawn'
  | 'restart-time-expired'
  | 'session-up'
  | 'end-of-rib';

export interface GrEvent {
  readonly atMs: number;
  readonly kind: EventKind;
}

export interface Outcome {
  /** When R2 notices R1 is gone. */
  readonly noticedMs: number;
  /** Whether R2 kept R1's routes as stale. */
  readonly keptStale: boolean;
  /** When R1's routes left R2's table, or null if they never did. */
  readonly deletedMs: number | null;
  /** When R1's routes were fresh again (End-of-RIB), or null. */
  readonly refreshedMs: number | null;
  readonly events: readonly GrEvent[];
  readonly segments: readonly Segment[];
  /** The end of the time shown. */
  readonly endMs: number;
  /** Total time traffic is lost, ms; Infinity if it never comes back. */
  readonly lossMs: number;
}

/** When R2 notices the session is gone. */
function noticedAt(s: Scenario): number {
  if (s.failure === 'control-plane') return 0;
  return s.detection === 'none' ? s.holdTimeMs : s.bfdDetectMs;
}

/** The route state, path and traffic from R1's failure onwards. */
export function simulate(s: Scenario): Outcome {
  const noticedMs = noticedAt(s);
  // A C-bit BFD going down means the forwarding plane failed: no graceful restart.
  const keptStale = s.gr && !(s.failure === 'whole-router' && s.detection === 'bfd-c1');
  const sessionUpMs = s.failure === 'control-plane' ? s.cpRestartMs : null;
  const eorMs = sessionUpMs === null ? null : sessionUpMs + s.eorAfterMs;
  const events: GrEvent[] = [{ atMs: 0, kind: 'failure' }];
  if (noticedMs > 0) events.push({ atMs: noticedMs, kind: 'noticed' });

  let deletedMs: number | null;
  if (keptStale) {
    events.push({ atMs: noticedMs, kind: 'stale-kept' });
    const deadline = noticedMs + s.restartTimeMs;
    if (sessionUpMs !== null && sessionUpMs <= deadline) {
      deletedMs = null;
    } else {
      deletedMs = deadline;
      events.push({ atMs: deadline, kind: 'restart-time-expired' });
    }
  } else {
    deletedMs = noticedMs;
    events.push({ atMs: noticedMs, kind: 'withdrawn' });
  }
  if (sessionUpMs !== null) events.push({ atMs: sessionUpMs, kind: 'session-up' });
  if (eorMs !== null) events.push({ atMs: eorMs, kind: 'end-of-rib' });
  events.sort((a, b) => a.atMs - b.atMs);

  const lastEvent = Math.max(...events.map((event) => event.atMs));
  const endMs = Math.max(30_000, Math.ceil((lastEvent * 1.15) / 10_000) * 10_000);
  const r1Forwards = s.failure === 'control-plane';

  const routeAt = (ms: number): RouteState => {
    if (eorMs !== null && ms >= eorMs) return 'fresh';
    if (ms < noticedMs) return 'fresh';
    if (deletedMs !== null && ms >= deletedMs) return 'none';
    return keptStale ? 'stale' : 'none';
  };
  const cuts = [...new Set([0, ...events.map((event) => event.atMs), endMs])]
    .filter((ms) => ms <= endMs)
    .sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 0; i + 1 < cuts.length; i += 1) {
    const fromMs = cuts[i]!;
    const toMs = cuts[i + 1]!;
    const route = routeAt(fromMs);
    const path: PathUsed = route !== 'none' ? 'r1' : s.backup ? 'backup' : 'none';
    const flowing = path === 'backup' || (path === 'r1' && r1Forwards);
    const last = segments[segments.length - 1];
    if (last && last.route === route && last.path === path) {
      segments[segments.length - 1] = { ...last, toMs };
    } else {
      segments.push({ fromMs, toMs, route, path, flowing });
    }
  }
  const finalFlowing = segments[segments.length - 1]!.flowing;
  const lossMs = finalFlowing
    ? segments.filter((seg) => !seg.flowing).reduce((sum, seg) => sum + seg.toMs - seg.fromMs, 0)
    : Infinity;

  return {
    noticedMs,
    keptStale,
    deletedMs,
    refreshedMs: eorMs,
    events,
    segments,
    endMs,
    lossMs,
  };
}
