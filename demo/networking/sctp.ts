/**
 * The SCTP lesson (REQ-444): multihoming failover and multi-streaming
 * (RFC 9260).
 *
 * Failover: an association has a primary and a secondary path. The primary
 * fails just after data was sent on it. Each retransmission timeout (T3-rtx)
 * on the primary adds one to its error counter and doubles its RTO, capped at
 * RTO.Max. The primary is marked inactive when the counter exceeds
 * Path.Max.Retrans, and new data then goes to the secondary.
 * Simplified: the RTO starts at its clamped value from the measured round
 * trip; the time to send the data and the jitter on timers are ignored.
 *
 * Multi-streaming: messages are sent at a fixed spacing and arrive after a
 * fixed one-way delay; one message is lost and its retransmission arrives a
 * fixed recovery time later. Within an ordered stream (and within a TCP byte
 * stream) a message is handed to the application only after every message
 * before it. Simplified: no other losses, no receive-window limits.
 */

/** RFC 9260 §16 protocol parameter defaults. */
export const RFC_DEFAULTS = {
  rtoInitialMs: 1000,
  rtoMinMs: 1000,
  rtoMaxMs: 60_000,
  pathMaxRetrans: 5,
  associationMaxRetrans: 10,
  hbIntervalMs: 30_000,
} as const;

export interface FailoverParams {
  readonly rtoMinMs: number;
  readonly rtoMaxMs: number;
  readonly pathMaxRetrans: number;
  /** Smoothed round trip on the primary, ms. */
  readonly srttMs: number;
  /** Round-trip variation on the primary, ms. */
  readonly rttvarMs: number;
}

/** The lesson's association: a 50 ms round trip that varies by 10 ms. */
export const LESSON_PATH = { srttMs: 50, rttvarMs: 10 } as const;

/** RTO = SRTT + 4 × RTTVAR, clamped to [RTO.Min, RTO.Max] (RFC 9260 §6.3.1). */
export function rtoFrom(params: FailoverParams): number {
  const computed = params.srttMs + 4 * params.rttvarMs;
  return Math.min(params.rtoMaxMs, Math.max(params.rtoMinMs, computed));
}

export interface Timeout {
  /** 1-based count of the consecutive timeout on the primary. */
  readonly n: number;
  /** The RTO that ran out, ms. */
  readonly rtoMs: number;
  /** When it ran out, ms after the failure. */
  readonly atMs: number;
}

export interface Failover {
  readonly startRtoMs: number;
  readonly timeouts: readonly Timeout[];
  /** When the primary is marked inactive and new data moves to the secondary. */
  readonly failoverMs: number;
}

/** Timeouts on the failed primary until its error counter exceeds Path.Max.Retrans. */
export function failover(params: FailoverParams): Failover {
  const startRtoMs = rtoFrom(params);
  const timeouts: Timeout[] = [];
  let rto = startRtoMs;
  let at = 0;
  for (let n = 1; n <= params.pathMaxRetrans + 1; n += 1) {
    at += rto;
    timeouts.push({ n, rtoMs: rto, atMs: at });
    rto = Math.min(params.rtoMaxMs, rto * 2);
  }
  return { startRtoMs, timeouts, failoverMs: at };
}

/** The defaults with the lesson's round trip. */
export function defaultFailoverParams(): FailoverParams {
  return {
    rtoMinMs: RFC_DEFAULTS.rtoMinMs,
    rtoMaxMs: RFC_DEFAULTS.rtoMaxMs,
    pathMaxRetrans: RFC_DEFAULTS.pathMaxRetrans,
    ...LESSON_PATH,
  };
}

export type MessageId = 'A1' | 'B1' | 'A2' | 'B2' | 'A3' | 'B3';

export interface Message {
  readonly id: MessageId;
  readonly stream: 1 | 2;
  readonly sentMs: number;
}

export const SPACING_MS = 10;
export const ONE_WAY_MS = 50;
export const RECOVERY_MS = 200;

/** Two streams, interleaved, 10 ms apart. */
export const MESSAGES: readonly Message[] = (['A1', 'B1', 'A2', 'B2', 'A3', 'B3'] as const).map(
  (id, index) => ({ id, stream: id.startsWith('A') ? 1 : 2, sentMs: index * SPACING_MS }),
);

export type Transport = 'sctp' | 'tcp';

export interface Delivery {
  readonly id: MessageId;
  readonly stream: 1 | 2;
  readonly arrivesMs: number;
  readonly deliveredMs: number;
  /** How much later than with no loss, ms. */
  readonly delayMs: number;
}

/**
 * When each message reaches the application. SCTP orders messages only within
 * their stream; one TCP connection orders every byte.
 */
export function deliver(transport: Transport, lost: MessageId): readonly Delivery[] {
  const lastByOrder = new Map<string, number>();
  return MESSAGES.map((message) => {
    const onTime = message.sentMs + ONE_WAY_MS;
    const arrivesMs = message.id === lost ? onTime + RECOVERY_MS : onTime;
    const order = transport === 'sctp' ? `stream-${message.stream}` : 'all';
    const deliveredMs = Math.max(arrivesMs, lastByOrder.get(order) ?? 0);
    lastByOrder.set(order, deliveredMs);
    return {
      id: message.id,
      stream: message.stream,
      arrivesMs,
      deliveredMs,
      delayMs: deliveredMs - onTime,
    };
  });
}

/** The messages handed over late. */
export function delayed(transport: Transport, lost: MessageId): readonly MessageId[] {
  return deliver(transport, lost)
    .filter((entry) => entry.delayMs > 0)
    .map((entry) => entry.id);
}
