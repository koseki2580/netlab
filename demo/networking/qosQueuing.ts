/**
 * The QoS queuing lesson (REQ-388): traffic already marked, then conditioned and
 * scheduled. Packet by packet, in microseconds, over two seconds:
 *
 * - Part 1 — a 5 Mbit/s contract enforced with a token bucket, by a policer
 *   (drops what does not conform) or a shaper (holds it until tokens arrive).
 * - Part 2 — one congested 10 Mbit/s interface, served first-in first-out or
 *   with a low-latency queue: strict priority for EF, policed so it cannot take
 *   the whole link, the rest in its own class queue (CBWFQ class-default).
 *
 * Offered load is fixed. A real TCP transfer would slow down after drops; the
 * lesson keeps the load as offered so each mechanism is seen on its own.
 */

export const RUN_US = 2_000_000;
export const TICK_US = 10_000;
export const TICKS = RUN_US / TICK_US;

export const BULK_BYTES = 1500;
/** A G.711 call: 160 bytes of voice + 40 of IP/UDP/RTP, every 20 ms (80 kbit/s). */
export const VOICE_BYTES = 200;
export const VOICE_INTERVAL_US = 20_000;
export const CALLS = 12;

/** Bulk bursts at 15 Mbit/s: one 1500-byte packet every 800 µs. */
export const BURST_MBPS = 15;
const BULK_GAP_US = (BULK_BYTES * 8) / BURST_MBPS;

export type TrafficClass = 'voice' | 'bulk' | 'rogue';
export interface Packet {
  readonly t: number;
  readonly bytes: number;
  readonly cls: TrafficClass;
}

const bulkTrain = (fromUs: number, toUs: number): Packet[] => {
  const packets: Packet[] = [];
  for (let t = fromUs; t < toUs; t += BULK_GAP_US)
    packets.push({ t, bytes: BULK_BYTES, cls: 'bulk' });
  return packets;
};

// ---------------------------------------------------------------- Part 1

export const CIR_BPS = 5_000_000;
/** Committed burst: 100 kbit, 20 ms at the CIR. */
export const BC_BITS = 100_000;
export const BURST_ON_US = 100_000;
export const BURST_PERIOD_US = 400_000;

/** The customer's traffic: 100 ms at 15 Mbit/s every 400 ms (3.75 Mbit/s on average). */
export const customerTraffic = (): Packet[] => {
  const packets: Packet[] = [];
  for (let start = 0; start < RUN_US; start += BURST_PERIOD_US)
    packets.push(...bulkTrain(start, start + BURST_ON_US));
  return packets;
};

export interface ConditionerResult {
  readonly offeredPackets: number;
  readonly offeredBytes: number;
  readonly deliveredPackets: number;
  readonly deliveredBytes: number;
  readonly droppedPackets: number;
  /** Longest time a delivered packet was held, µs. */
  readonly maxDelayUs: number;
  /** Most bytes waiting at once. */
  readonly maxQueueBytes: number;
  /** When the last delivered packet left, µs. */
  readonly lastDepartureUs: number;
  /** Delivered packets, each with the time it left. */
  readonly departures: readonly {
    readonly t: number;
    readonly left: number;
    readonly bytes: number;
  }[];
}

const summarise = (
  packets: readonly Packet[],
  departures: ConditionerResult['departures'],
): ConditionerResult => {
  let maxQueueBytes = 0;
  for (const p of packets) {
    // Bytes that have arrived by p.t and not yet left (departures are in arrival order).
    let waiting = 0;
    for (const d of departures) if (d.t <= p.t && d.left > p.t) waiting += d.bytes;
    maxQueueBytes = Math.max(maxQueueBytes, waiting);
  }
  const sum = (list: readonly { bytes: number }[]) => list.reduce((s, p) => s + p.bytes, 0);
  return {
    offeredPackets: packets.length,
    offeredBytes: sum(packets),
    deliveredPackets: departures.length,
    deliveredBytes: sum(departures),
    droppedPackets: packets.length - departures.length,
    maxDelayUs: departures.reduce((m, d) => Math.max(m, d.left - d.t), 0),
    maxQueueBytes,
    lastDepartureUs: departures.reduce((m, d) => Math.max(m, d.left), 0),
    departures,
  };
};

/** A token bucket: `rate` bits/µs, at most `depth` bits, full at the start. */
const bucket = (rateBps: number, depthBits: number) => {
  const rate = rateBps / 1_000_000;
  let tokens = depthBits;
  let at = 0;
  return {
    fillTo(t: number) {
      tokens = Math.min(depthBits, tokens + rate * (t - at));
      at = t;
    },
    /** µs until `bits` tokens are there (0 if they already are). */
    waitFor(bits: number) {
      return tokens >= bits ? 0 : Math.ceil((bits - tokens) / rate);
    },
    take(bits: number) {
      if (tokens < bits) return false;
      tokens -= bits;
      return true;
    },
  };
};

/** A policer: a packet that finds enough tokens passes at once; one that does not is dropped. */
export function police(packets: readonly Packet[], rateBps = CIR_BPS, depthBits = BC_BITS) {
  const tokens = bucket(rateBps, depthBits);
  const departures: { t: number; left: number; bytes: number }[] = [];
  for (const p of packets) {
    tokens.fillTo(p.t);
    if (tokens.take(p.bytes * 8)) departures.push({ t: p.t, left: p.t, bytes: p.bytes });
  }
  return summarise(packets, departures);
}

/** A shaper: packets wait in a queue, in order, until the bucket holds enough tokens to send them. */
export function shape(packets: readonly Packet[], rateBps = CIR_BPS, depthBits = BC_BITS) {
  const tokens = bucket(rateBps, depthBits);
  const departures: { t: number; left: number; bytes: number }[] = [];
  let free = 0;
  for (const p of packets) {
    let left = Math.max(p.t, free);
    tokens.fillTo(left);
    const wait = tokens.waitFor(p.bytes * 8);
    left += wait;
    tokens.fillTo(left);
    tokens.take(p.bytes * 8);
    departures.push({ t: p.t, left, bytes: p.bytes });
    free = left;
  }
  return summarise(packets, departures);
}

/** Mbit/s sent in each 10 ms tick, for the chart. */
export const sentPerTick = (result: ConditionerResult) => {
  const bits = new Array<number>(TICKS).fill(0);
  for (const d of result.departures) {
    const tick = Math.floor(d.left / TICK_US);
    if (tick < TICKS) bits[tick] = (bits[tick] ?? 0) + d.bytes * 8;
  }
  return bits.map((b) => b / TICK_US);
};

/** Mbit/s offered in each 10 ms tick. */
export const offeredPerTick = (packets: readonly Packet[]) => {
  const bits = new Array<number>(TICKS).fill(0);
  for (const p of packets) {
    const tick = Math.floor(p.t / TICK_US);
    bits[tick] = (bits[tick] ?? 0) + p.bytes * 8;
  }
  return bits.map((b) => b / TICK_US);
};

// ---------------------------------------------------------------- Part 2

export const LINK_BPS = 10_000_000;
/** The interface's buffer: 100 full-size packets, 120 ms at 10 Mbit/s. */
export const BUFFER_BYTES = 150_000;
/** The priority class: 2 Mbit/s, with a 200 ms (400 kbit) burst. */
export const PRIORITY_BPS = 2_000_000;
export const PRIORITY_BURST_BITS = 400_000;
/** The big transfer runs from 0.5 s to 1.5 s. */
export const TRANSFER_FROM_US = 500_000;
export const TRANSFER_TO_US = 1_500_000;
/** Something else wrongly marked EF: 8 Mbit/s of full-size packets. */
export const ROGUE_MBPS = 8;

export type Scheduler = 'fifo' | 'llq' | 'priority-unpoliced';
export interface LinkSetup {
  readonly scheduler: Scheduler;
  readonly rogueEf: boolean;
}

export const linkTraffic = (rogueEf: boolean): Packet[] => {
  const packets: Packet[] = [];
  for (let call = 0; call < CALLS; call += 1)
    for (let t = Math.round((call * VOICE_INTERVAL_US) / CALLS); t < RUN_US; t += VOICE_INTERVAL_US)
      packets.push({ t, bytes: VOICE_BYTES, cls: 'voice' });
  packets.push(...bulkTrain(TRANSFER_FROM_US, TRANSFER_TO_US));
  if (rogueEf)
    for (let t = 0; t < RUN_US; t += (BULK_BYTES * 8) / ROGUE_MBPS)
      packets.push({ t, bytes: BULK_BYTES, cls: 'rogue' });
  return packets.sort((a, b) => a.t - b.t);
};

export interface ClassStats {
  readonly offered: number;
  readonly dropped: number;
  readonly lossPct: number;
  /** Delivered while the transfer runs (0.5–1.5 s), Mbit/s. */
  readonly mbpsDuringTransfer: number;
  readonly maxDelayUs: number;
  readonly minDelayUs: number;
  /** Spread of delays, max − min, µs. */
  readonly jitterUs: number;
}

export interface LinkResult {
  readonly voice: ClassStats;
  readonly bulk: ClassStats;
  readonly rogue: ClassStats;
  /** Worst voice delay among packets that arrived in each 10 ms tick, ms (null: none delivered). */
  readonly voiceDelayPerTick: readonly (number | null)[];
}

interface Sent {
  readonly packet: Packet;
  readonly finish: number;
}

/** One interface sending one packet at a time (no pre-emption) at 10 Mbit/s. */
export function runLink(setup: LinkSetup): LinkResult {
  const arrivals = linkTraffic(setup.rogueEf);
  const isEf = (p: Packet) => p.cls !== 'bulk';
  const single = setup.scheduler === 'fifo';
  const priority: Packet[] = [];
  const other: Packet[] = [];
  let otherBytes = 0;
  const policer = bucket(PRIORITY_BPS, PRIORITY_BURST_BITS);
  const sent: Sent[] = [];
  let busyUntil = 0;
  let next = 0;
  const serialisation = (bytes: number) => (bytes * 8 * 1_000_000) / LINK_BPS;

  while (next < arrivals.length || priority.length > 0 || other.length > 0) {
    const queued = priority.length + other.length > 0;
    const packet = arrivals[next];
    const arrivalAt = packet ? packet.t : Infinity;
    if (queued && busyUntil < arrivalAt) {
      // The link is free before the next arrival: start the next packet.
      const fromPriority = priority.length > 0;
      const head = fromPriority ? priority.shift()! : other.shift()!;
      if (!fromPriority) otherBytes -= head.bytes;
      busyUntil += serialisation(head.bytes);
      sent.push({ packet: head, finish: busyUntil });
      continue;
    }
    if (!packet) break;
    next += 1;
    if (!queued && busyUntil < packet.t) busyUntil = packet.t;
    if (!single && isEf(packet)) {
      if (setup.scheduler === 'llq') {
        policer.fillTo(packet.t);
        if (!policer.take(packet.bytes * 8)) continue;
      }
      priority.push(packet);
    } else if (otherBytes + packet.bytes <= BUFFER_BYTES) {
      other.push(packet);
      otherBytes += packet.bytes;
    }
  }

  const stats = (cls: TrafficClass): ClassStats => {
    const offered = arrivals.filter((p) => p.cls === cls).length;
    const mine = sent.filter((s) => s.packet.cls === cls);
    const delays = mine.map((s) => s.finish - s.packet.t);
    const inWindow = mine.filter((s) => s.finish >= TRANSFER_FROM_US && s.finish < TRANSFER_TO_US);
    const maxDelayUs = delays.length ? Math.max(...delays) : 0;
    const minDelayUs = delays.length ? Math.min(...delays) : 0;
    return {
      offered,
      dropped: offered - mine.length,
      lossPct: offered ? Math.round(((offered - mine.length) / offered) * 1000) / 10 : 0,
      mbpsDuringTransfer:
        inWindow.reduce((s, x) => s + x.packet.bytes * 8, 0) / (TRANSFER_TO_US - TRANSFER_FROM_US),
      maxDelayUs,
      minDelayUs,
      jitterUs: maxDelayUs - minDelayUs,
    };
  };

  const voiceDelayPerTick: (number | null)[] = new Array(TICKS).fill(null);
  for (const s of sent) {
    if (s.packet.cls !== 'voice') continue;
    const tick = Math.floor(s.packet.t / TICK_US);
    const ms = (s.finish - s.packet.t) / 1000;
    voiceDelayPerTick[tick] = Math.max(voiceDelayPerTick[tick] ?? 0, ms);
  }

  return { voice: stats('voice'), bulk: stats('bulk'), rogue: stats('rogue'), voiceDelayPerTick };
}
