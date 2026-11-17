/**
 * The streaming-telemetry lesson (REQ-382): ten minutes of one 1 Gbit/s
 * interface — a steady 15 %, a 20-second burst to 100 %, and a 30-second
 * outage — watched by an SNMP poll every five minutes and by a gNMI
 * subscription sampling every ten seconds (SAMPLE) and pushing state changes
 * as they happen (ON_CHANGE). Both read utilisation the way monitors do: the
 * difference between two readings of the interface's octet counter.
 */
export const SECONDS = 600;
export const CAPACITY_BYTES_PER_S = 125_000_000; // 1 Gbit/s
export const BURST = { from: 130, to: 150 } as const;
export const OUTAGE = { from: 400, to: 430 } as const;
export const POLL_S = 300;
export const SAMPLE_S = 10;
export const COUNTER_PATH = '/interfaces/interface[name=eth1]/state/counters/in-octets';
export const STATUS_PATH = '/interfaces/interface[name=eth1]/state/oper-status';

const BASE = 0.15;

/** The link's real load in second t, 0–1. */
export function loadAt(t: number): number {
  if (t >= OUTAGE.from && t < OUTAGE.to) return 0;
  if (t >= BURST.from && t < BURST.to) return 1;
  return BASE;
}

export function operStatusAt(t: number): 'UP' | 'DOWN' {
  return t >= OUTAGE.from && t < OUTAGE.to ? 'DOWN' : 'UP';
}

/** The in-octets counter at the start of second t. */
export function inOctets(t: number): number {
  let total = 0;
  for (let second = 0; second < t; second++) total += loadAt(second) * CAPACITY_BYTES_PER_S;
  return total;
}

export interface Reading {
  /** End of the interval, s. */
  readonly at: number;
  /** Utilisation over the interval, %, from the counter difference. */
  readonly utilPct: number;
}

/** Readings every `interval` seconds, each from two counter readings. */
export function readings(interval: number): Reading[] {
  const out: Reading[] = [];
  for (let at = interval; at <= SECONDS; at += interval) {
    const bytes = inOctets(at) - inOctets(at - interval);
    out.push({ at, utilPct: Math.round((bytes / (CAPACITY_BYTES_PER_S * interval)) * 1000) / 10 });
  }
  return out;
}

export const peak = (series: readonly Reading[]) => Math.max(...series.map((r) => r.utilPct));

/** What the poller sees of the link's state: its status at each poll. */
export function polledStatus(): { at: number; status: 'UP' | 'DOWN' }[] {
  const out: { at: number; status: 'UP' | 'DOWN' }[] = [];
  for (let at = POLL_S; at <= SECONDS; at += POLL_S) out.push({ at, status: operStatusAt(at) });
  return out;
}

/** ON_CHANGE: one notification each time the status changes. */
export function statusChanges(): { at: number; status: 'UP' | 'DOWN' }[] {
  const out: { at: number; status: 'UP' | 'DOWN' }[] = [];
  for (let t = 1; t < SECONDS; t++) {
    if (operStatusAt(t) !== operStatusAt(t - 1)) out.push({ at: t, status: operStatusAt(t) });
  }
  return out;
}
