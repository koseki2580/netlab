import type { TcpHeaderOptions } from '../../types/packets';
import type { TcpCongestionState } from '../../types/tcp-congestion';
import type { TcpNegotiatedOptions } from '../../types/tcp';
import { TcpCongestionControl } from './TcpCongestionControl';
import { usableWindow } from './tcpWindow';

export { usableWindow };

/**
 * TCP flow control and the options of the handshake, as plain data: nothing
 * here sends a packet. `TcpOrchestrator.transfer` turns a plan into segments.
 *
 * Time is counted in rounds. A round stands for one round trip, and also for
 * the waits the RFCs set in retransmission timeouts, so the first zero-window
 * probe comes one round after the window closed and the gap then doubles.
 * Every segment is acknowledged (no delayed ACKs) and nothing is lost here.
 */

const DEFAULT_MSS = 1460;
/** RFC 9293 §3.7.1: what a sender assumes when no MSS was announced. */
const UNANNOUNCED_MSS = 536;
const DEFAULT_RECEIVE_BUFFER = 65535;
const WINDOW_FIELD_MAX = 0xffff;
/** RFC 7323 §2.3. */
const MAX_WINDOW_SHIFT = 14;
const DEFAULT_MAX_ROUNDS = 64;
/** A constant: rounds have no length here, and nothing reads the RTT estimate. */
const ROUND_TRIP_MS = 100;

export interface TcpEndpointConfig {
  /** What this end will receive per segment. Default 1460. */
  readonly mss?: number;
  /** The shift to offer; `null` offers no window scale option. Default 0. */
  readonly windowScale?: number | null;
  /** Default true. */
  readonly sackPermitted?: boolean;
  /** Bytes of receive buffer, the window this end opens with. Default 65535. */
  readonly receiveBuffer?: number;
}

export interface TcpEndpoints {
  readonly client?: TcpEndpointConfig;
  readonly server?: TcpEndpointConfig;
}

/** The options of a SYN. */
export function synOptions(endpoint: TcpEndpointConfig): TcpHeaderOptions {
  const windowScale = endpoint.windowScale === undefined ? 0 : endpoint.windowScale;
  return {
    mss: endpoint.mss ?? DEFAULT_MSS,
    ...(windowScale === null ? {} : { windowScale }),
    ...(endpoint.sackPermitted === false ? {} : { sackPermitted: true }),
  };
}

/** The options of a SYN-ACK: window scale and SACK-permitted only in answer to a SYN that had them. */
export function synAckOptions(
  endpoint: TcpEndpointConfig,
  syn: TcpHeaderOptions,
): TcpHeaderOptions {
  const own = synOptions(endpoint);
  return {
    ...(own.mss === undefined ? {} : { mss: own.mss }),
    ...(syn.windowScale === undefined || own.windowScale === undefined
      ? {}
      : { windowScale: own.windowScale }),
    ...(syn.sackPermitted && own.sackPermitted ? { sackPermitted: true } : {}),
  };
}

const shiftOf = (scale: number | undefined): number => Math.min(scale ?? 0, MAX_WINDOW_SHIFT);

/** What a handshake with these two sets of options settled. */
export function negotiateTcpOptions(
  syn: TcpHeaderOptions,
  synAck: TcpHeaderOptions,
): TcpNegotiatedOptions {
  const clientMss = syn.mss ?? UNANNOUNCED_MSS;
  const serverMss = synAck.mss ?? UNANNOUNCED_MSS;
  const windowScaling = syn.windowScale !== undefined && synAck.windowScale !== undefined;
  const sendMss = Math.min(clientMss, serverMss);
  return {
    clientSendMss: sendMss,
    serverSendMss: sendMss,
    windowScaling,
    clientWindowShift: windowScaling ? shiftOf(syn.windowScale) : 0,
    serverWindowShift: windowScaling ? shiftOf(synAck.windowScale) : 0,
    sackPermitted: syn.sackPermitted === true && synAck.sackPermitted === true,
  };
}

/** The value of the 16-bit window field for a window of `bytes`. */
export function advertisedWindowField(bytes: number, shift: number): number {
  return Math.min(Math.floor(bytes / 2 ** shift), WINDOW_FIELD_MAX);
}

export interface TcpTransferConfig {
  readonly bytes: number;
  /** The most data the sender may put in one segment. */
  readonly mss: number;
  readonly receiveBuffer: number;
  /** The shift the receiver applies to the windows it advertises. Default 0. */
  readonly windowShift?: number;
  /** The window field the sender's own segments carry, in the sender's scale. Default 65535. */
  readonly senderWindowField?: number;
  /** The sender's window in bytes. Default 65535. */
  readonly senderWindow?: number;
  /** How many bytes the receiving application takes in this round. */
  readonly readBytes: (round: number) => number;
  /** Default 1. */
  readonly initialCwndSegments?: number;
  /** A transfer not finished by then is reported as not completed. */
  readonly maxRounds?: number;
}

export type TcpTransferStepKind = 'data' | 'ack' | 'probe' | 'probe-ack' | 'window-update';

export interface TcpTransferStep {
  readonly kind: TcpTransferStepKind;
  readonly round: number;
  /** Counted from the first byte of the transfer. */
  readonly seq: number;
  /** Bytes of data the segment carries. */
  readonly length: number;
  /** The next byte the receiver expects, counted the same way. */
  readonly ack: number;
  /** The window this segment advertises, in bytes; on data, the sender's own. */
  readonly window: number;
  /** The value of the window field: `window` after scaling. */
  readonly windowField: number;
  /** The sender, once this step has happened. */
  readonly cwnd: number;
  readonly rwnd: number;
  readonly inFlight: number;
}

export interface TcpTransferPlan {
  readonly steps: readonly TcpTransferStep[];
  /** Every byte was acknowledged. */
  readonly completed: boolean;
  /** Bytes the receiver has accepted. */
  readonly delivered: number;
  /** Bytes the receiver accepted and its application has not read. */
  readonly unread: number;
  readonly congestion: Readonly<TcpCongestionState>;
}

/** The sender's rule of RFC 9293 §3.8.6.2.1, with the override timeout taken as "nothing in flight". */
function bytesToSend(
  queued: number,
  usable: number,
  mss: number,
  largestWindow: number,
  flight: number,
) {
  const can = Math.min(queued, usable);
  if (can <= 0) return 0;
  if (can >= mss) return mss;
  if (queued <= usable) return can;
  if (can >= largestWindow / 2) return can;
  return flight === 0 ? can : 0;
}

/** A transfer from the first byte to the last, or to `maxRounds`. */
export function planTcpTransfer(config: TcpTransferConfig): TcpTransferPlan {
  const shift = config.windowShift ?? 0;
  const { bytes, mss, receiveBuffer } = config;
  const maxRounds = config.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const senderWindow = config.senderWindow ?? DEFAULT_RECEIVE_BUFFER;
  const senderField = config.senderWindowField ?? advertisedWindowField(senderWindow, 0);
  const congestion = new TcpCongestionControl({
    mss,
    ...(config.initialCwndSegments ? { iwSegments: config.initialCwndSegments } : {}),
  });

  /** What the window field can say: rounded down to the shift, capped at the field. */
  const offerable = (window: number) => advertisedWindowField(window, shift) * 2 ** shift;

  const steps: TcpTransferStep[] = [];
  let unread = 0;
  let received = 0;
  let window = offerable(receiveBuffer);
  let advertised = window;

  let rwnd = window;
  let largestWindow = window;
  let sent = 0;
  let acknowledged = 0;
  let stepIndex = 0;
  let nextProbe: number | null = null;
  let probeGap = 1;

  const record = (
    round: number,
    kind: TcpTransferStepKind,
    seq: number,
    length: number,
    advertisement: number,
    field: number,
  ) => {
    const { cwnd } = congestion.state;
    steps.push({
      kind,
      round,
      seq,
      length,
      ack: received,
      window: advertisement,
      windowField: field,
      cwnd,
      rwnd,
      inFlight: sent - acknowledged,
    });
    stepIndex += 1;
  };

  /** RFC 9293 §3.8.6.2.2: the window opens only by min(buffer / 2, MSS) at a time. */
  const openWindow = () => {
    const free = receiveBuffer - unread;
    if (free - window >= Math.min(receiveBuffer / 2, mss)) window = offerable(free);
  };

  const advertise = () => {
    advertised = window;
    return { advertisement: window, field: advertisedWindowField(window, shift) };
  };

  for (let round = 0; round < maxRounds && acknowledged < bytes; round += 1) {
    let budget = config.readBytes(round);
    const read = () => {
      const taken = Math.min(budget, unread);
      unread -= taken;
      budget -= taken;
    };

    const burst: { seq: number; length: number }[] = [];
    for (;;) {
      const inFlight = sent - acknowledged;
      const usable = usableWindow({ cwnd: congestion.state.cwnd, rwnd, inFlight });
      const length = bytesToSend(bytes - sent, usable, mss, largestWindow, inFlight);
      if (length === 0) break;
      congestion.onSegmentSent(sent, length, stepIndex);
      burst.push({ seq: sent, length });
      sent += length;
      record(round, 'data', burst[burst.length - 1]!.seq, length, senderWindow, senderField);
    }

    for (const segment of burst) {
      received += segment.length;
      unread += segment.length;
      window -= segment.length;
      read();
      openWindow();
      const { advertisement, field } = advertise();
      acknowledged = received;
      rwnd = advertisement;
      largestWindow = Math.max(largestWindow, rwnd);
      congestion.setRwnd(rwnd);
      congestion.onAckReceived(received, ROUND_TRIP_MS, stepIndex);
      record(round, 'ack', received, 0, advertisement, field);
    }

    const closed = rwnd === 0 && acknowledged === sent && sent < bytes;
    if (closed && burst.length === 0) {
      if (nextProbe === null) nextProbe = round;
      if (round >= nextProbe) {
        record(round, 'probe', sent, 1, senderWindow, senderField);
        const { advertisement, field } = advertise();
        rwnd = advertisement;
        record(round, 'probe-ack', received, 0, advertisement, field);
        nextProbe = round + probeGap;
        probeGap *= 2;
      }
    }

    read();
    openWindow();
    if (window > advertised) {
      const { advertisement, field } = advertise();
      rwnd = advertisement;
      largestWindow = Math.max(largestWindow, rwnd);
      congestion.setRwnd(rwnd);
      nextProbe = null;
      probeGap = 1;
      record(round, 'window-update', received, 0, advertisement, field);
    }
  }

  return {
    steps,
    completed: acknowledged === bytes,
    delivered: received,
    unread,
    congestion: congestion.state,
  };
}
