/**
 * The lossless data-centre Ethernet lesson (REQ-435): N-to-1 incast into one
 * switch port, as RoCEv2 traffic would meet it, with plain Ethernet (tail
 * drop), with PFC (IEEE 802.1Qbb priority-based flow control) and with PFC
 * plus ECN marking (RFC 3168) and a DCQCN-style rate cut at the senders.
 *
 * Time moves in ticks of one frame time: a 1,500-byte frame on a 100 Gb/s
 * link, 120 ns. Light in fibre covers about 24 m in that time (5 ns/m), so
 * the cable delay is counted in whole ticks.
 *
 * Simplified:
 * - Every sender and both egress ports run at line rate, one frame per tick.
 * - Sender S1 shares its upstream link (and priority) with the innocent flow
 *   V, which goes to a different, idle egress port E2: S1 may send on odd
 *   ticks, V on even ticks. V is a bulk transfer that always has a frame.
 * - The congested port E1 has one shared buffer. PFC reserves `headroom`
 *   frames per incast ingress port out of it, and pauses an ingress port
 *   when the buffer reaches `buffer − ports × headroom` (XOFF), resuming when
 *   it falls 2 frames below that (XON). Every incast port fills at the same
 *   pace, so the switch pauses and resumes them together.
 * - PAUSE reaches a sender after the one-way cable delay; frames already on
 *   the wire keep arriving, which is what the headroom absorbs.
 * - ECN: a frame arriving while E1 holds more than `ecnThreshold` frames is
 *   marked CE instead of dropped (no RED ramp). The mark reaches its sender
 *   one round trip later as a CNP. A sender halves its rate at most once per
 *   `cutEvery` ticks (DCQCN's first cut, alpha = 1, with no alpha
 *   bookkeeping) and otherwise adds `1/16` of line rate back every
 *   `recoverEvery` ticks. These timers are this lesson's choices, not
 *   DCQCN's defaults.
 * - Dropped frames are counted, not retransmitted.
 */

export type Mode = 'plain' | 'pfc' | 'pfc-ecn';
export const MODES: readonly Mode[] = ['plain', 'pfc', 'pfc-ecn'];

export const LINK_GBPS = 100;
export const FRAME_BYTES = 1500;
/** One frame time at 100 Gb/s, ns. */
export const FRAME_NS = (FRAME_BYTES * 8) / LINK_GBPS;
/** Signal propagation in fibre, ns per metre. */
export const NS_PER_METRE = 5;

export interface IncastConfig {
  readonly senders: number;
  readonly burstFrames: number;
  /** Buffer of the congested egress port, frames. */
  readonly bufferFrames: number;
  /** PFC headroom reserved per incast ingress port, frames. */
  readonly headroomFrames: number;
  readonly cableMetres: number;
  readonly ecnThreshold: number;
  readonly cutEvery: number;
  readonly recoverEvery: number;
  readonly ticks: number;
}

export const DEFAULT_CONFIG: IncastConfig = {
  senders: 8,
  burstFrames: 64,
  bufferFrames: 160,
  headroomFrames: 10,
  cableMetres: 96,
  ecnThreshold: 10,
  cutEvery: 2,
  recoverEvery: 10,
  ticks: 700,
};

/**
 * Simplified PFC headroom estimate, bytes: what the sender keeps putting on
 * the wire while a PAUSE travels to it and the last frames travel back
 * (2 × rate × cable delay), plus one maximum frame at each end that cannot
 * be cut off mid-transmission (2 × MTU). Real vendor formulas add the PHY
 * and MAC response times IEEE 802.1Qbb allows.
 */
export function headroomBytes(cableMetres: number, gbps = LINK_GBPS, mtu = FRAME_BYTES): number {
  const delayNs = cableMetres * NS_PER_METRE;
  return 2 * (gbps / 8) * delayNs + 2 * mtu;
}

/** The headroom estimate in whole frames, rounded up. */
export function headroomFrames(cableMetres: number): number {
  return Math.ceil(headroomBytes(cableMetres) / FRAME_BYTES);
}

/** One-way cable delay in whole ticks, at least one. */
export function oneWayTicks(cableMetres: number): number {
  return Math.max(1, Math.ceil((cableMetres * NS_PER_METRE) / FRAME_NS));
}

export interface IncastOutcome {
  readonly mode: Mode;
  readonly offered: number;
  readonly delivered: number;
  readonly drops: number;
  /** XOFF frames the switch sent (each pauses every incast port). */
  readonly pauses: number;
  /** Ticks during which the switch held its ingress ports paused. */
  readonly pausedTicks: number;
  readonly marks: number;
  readonly maxQueue: number;
  /** Tick at which E1 sent the last incast frame. */
  readonly finishTick: number;
  /** Frames V got through, and the most it could have sent (every even tick). */
  readonly innocentSent: number;
  readonly innocentMax: number;
  /** E1's queue after each tick. */
  readonly queue: readonly number[];
}

export function simulate(mode: Mode, config: IncastConfig = DEFAULT_CONFIG): IncastOutcome {
  const { senders, burstFrames, bufferFrames, ticks } = config;
  const lag = oneWayTicks(config.cableMetres);
  const pfc = mode !== 'plain';
  const ecn = mode === 'pfc-ecn';
  const xoff = Math.max(0, bufferFrames - senders * config.headroomFrames);
  const xon = Math.max(0, xoff - 2);

  const remaining = Array.from({ length: senders }, () => burstFrames);
  const rate = Array.from({ length: senders }, () => 1);
  const credit = Array.from({ length: senders }, () => 0);
  const lastChange = Array.from({ length: senders }, () => -Infinity);
  // Frames on the wire, by arrival tick: the sender index, or -1 for V.
  const wire = new Map<number, number[]>();
  // CNPs on their way back, by arrival tick: sender indices.
  const cnps = new Map<number, number[]>();
  const pausedAt: boolean[] = [];

  let queue = 0;
  let paused = false;
  let drops = 0;
  let pauses = 0;
  let pausedTicks = 0;
  let marks = 0;
  let maxQueue = 0;
  let delivered = 0;
  let finishTick = 0;
  let innocentSent = 0;
  let innocentMax = 0;
  const trace: number[] = [];

  for (let tick = 0; tick < ticks; tick += 1) {
    // 1. Frames arriving at the switch.
    for (const from of wire.get(tick) ?? []) {
      if (from < 0) continue; // V goes to the idle port E2 and straight out
      if (queue >= bufferFrames) {
        drops += 1;
        continue;
      }
      if (ecn && queue > config.ecnThreshold) {
        marks += 1;
        const back = tick + 2 * lag;
        cnps.set(back, [...(cnps.get(back) ?? []), from]);
      }
      queue += 1;
    }
    wire.delete(tick);
    maxQueue = Math.max(maxQueue, queue);

    // 2. E1 sends one frame.
    if (queue > 0) {
      queue -= 1;
      delivered += 1;
      finishTick = tick;
    }

    // 3. PFC: pause or resume the incast ingress ports.
    if (pfc) {
      if (!paused && queue >= xoff) {
        paused = true;
        pauses += 1;
      } else if (paused && queue <= xon) {
        paused = false;
      }
    }
    if (paused) pausedTicks += 1;
    pausedAt[tick] = paused;

    // 4. DCQCN-style reaction at the senders.
    for (const index of cnps.get(tick) ?? []) {
      if (tick - lastChange[index]! >= config.cutEvery) {
        rate[index] = Math.max(1 / 64, rate[index]! / 2);
        lastChange[index] = tick;
      }
    }
    cnps.delete(tick);
    for (let index = 0; index < senders; index += 1) {
      if (rate[index]! < 1 && tick - lastChange[index]! >= config.recoverEvery) {
        rate[index] = Math.min(1, rate[index]! + 1 / 16);
        lastChange[index] = tick;
      }
    }

    // 5. Senders put frames on the wire, unless a PAUSE has reached them.
    const stopped = pausedAt[tick - lag] ?? false;
    const arrive = tick + lag;
    const send = (from: number) => wire.set(arrive, [...(wire.get(arrive) ?? []), from]);
    const vTurn = tick % 2 === 0;
    if (vTurn) innocentMax += 1;
    if (vTurn && !stopped) {
      innocentSent += 1;
      send(-1);
    }
    for (let index = 0; index < senders; index += 1) {
      if (stopped || (remaining[index] ?? 0) === 0) continue;
      if (index === 0 && vTurn) continue; // S1's link is V's on even ticks
      credit[index] = Math.min(1, credit[index]! + rate[index]!);
      if (credit[index]! >= 1) {
        credit[index] = credit[index]! - 1;
        remaining[index] = remaining[index]! - 1;
        send(index);
      }
    }
    trace.push(queue);
  }

  return {
    mode,
    offered: senders * burstFrames,
    delivered,
    drops,
    pauses,
    pausedTicks,
    marks,
    maxQueue,
    finishTick,
    innocentSent,
    innocentMax,
    queue: trace,
  };
}
