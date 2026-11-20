/**
 * The IPv6 Neighbor Discovery lesson (REQ-403): the neighbour cache's
 * reachability state machine (NUD, RFC 4861 §7.3), stateless address
 * autoconfiguration from a Router Advertisement (RFC 4862, EUI-64 interface
 * IDs per RFC 4291 Appendix A), and duplicate address detection (RFC 4862 §5.4).
 *
 * Simplified: ReachableTime is the 30 s base value without the random factor
 * (0.5–1.5) RFC 4861 applies; the link delay is zero, so a live neighbour's
 * Neighbor Advertisement arrives the moment it is solicited; no upper-layer
 * protocol (such as a TCP acknowledgement) ever confirms reachability; DAD
 * sends its one probe at once, without the random initial delay.
 */
import {
  canonicalizeIpv6,
  deriveEui64InterfaceId,
  parseIpv6,
  parseIpv6Cidr,
} from '../../src/utils/ipv6';
import { solicitedNodeAddress } from './ndp';

/** RFC 4861 §10 constants and defaults. */
export const REACHABLE_TIME_MS = 30_000;
export const DELAY_FIRST_PROBE_TIME_MS = 5_000;
export const RETRANS_TIMER_MS = 1_000;
export const MAX_MULTICAST_SOLICIT = 3;
export const MAX_UNICAST_SOLICIT = 3;

/** `NONE` means A has no entry for B. */
export type NdState = 'NONE' | 'INCOMPLETE' | 'REACHABLE' | 'STALE' | 'DELAY' | 'PROBE';

export type NdEventKind =
  | 'send' // A sends B a packet
  | 'ns-multicast' // Neighbor Solicitation to B's solicited-node group
  | 'ns-unicast' // Neighbor Solicitation straight to B's cached MAC
  | 'na' // B's solicited Neighbor Advertisement arrives
  | 'reachable-expired' // ReachableTime passed with no confirmation
  | 'delay-expired' // DELAY_FIRST_PROBE_TIME passed with no confirmation
  | 'deleted'; // no answer to the last solicitation

export interface NdEvent {
  readonly atMs: number;
  readonly kind: NdEventKind;
  /** The entry's state after this event. */
  readonly state: NdState;
  /** For solicitations: which one this is (1-based). */
  readonly solicit?: number;
}

export interface NudScenario {
  /** When A hands a packet for B to IPv6, ms. */
  readonly sendsAtMs: readonly number[];
  /** When B goes away (stops answering), or null if it never does. */
  readonly bGoneAtMs: number | null;
  /** Simulate up to this time, ms. */
  readonly untilMs: number;
}

/** The lesson's story: A talks to B at 0 s and again at 40 s; B may vanish at 35 s. */
export function lessonScenario(bGone: boolean): NudScenario {
  return { sendsAtMs: [0, 40_000], bGoneAtMs: bGone ? 35_000 : null, untilMs: 80_000 };
}

/** A's neighbour-cache entry for B, event by event (RFC 4861 §7.3.3, Appendix C). */
export function nudTimeline(scenario: NudScenario): NdEvent[] {
  const events: NdEvent[] = [];
  const sends = [...scenario.sendsAtMs].sort((a, b) => a - b);
  // An object, so the closure's changes are not narrowed away by the loop's control flow.
  const entry: { state: NdState; timerAt: number | null; solicits: number } = {
    state: 'NONE',
    timerAt: null,
    solicits: 0,
  };
  const alive = (ms: number) => scenario.bGoneAtMs === null || ms < scenario.bGoneAtMs;
  const log = (atMs: number, kind: NdEventKind, solicit?: number) =>
    events.push(
      solicit === undefined
        ? { atMs, kind, state: entry.state }
        : { atMs, kind, state: entry.state, solicit },
    );

  const solicit = (atMs: number, kind: 'ns-multicast' | 'ns-unicast') => {
    entry.solicits += 1;
    log(atMs, kind, entry.solicits);
    if (alive(atMs)) {
      entry.state = 'REACHABLE';
      entry.timerAt = atMs + REACHABLE_TIME_MS;
      entry.solicits = 0;
      log(atMs, 'na');
    } else {
      entry.timerAt = atMs + RETRANS_TIMER_MS;
    }
  };

  for (;;) {
    const nextSend = sends[0] ?? Infinity;
    const nextTimer = entry.timerAt ?? Infinity;
    const now = Math.min(nextSend, nextTimer);
    if (now > scenario.untilMs) break;
    if (nextTimer <= nextSend) {
      entry.timerAt = null;
      if (entry.state === 'REACHABLE') {
        entry.state = 'STALE';
        log(now, 'reachable-expired');
      } else if (entry.state === 'DELAY') {
        entry.state = 'PROBE';
        log(now, 'delay-expired');
        entry.solicits = 0;
        solicit(now, 'ns-unicast');
      } else if (entry.state === 'PROBE' || entry.state === 'INCOMPLETE') {
        const max = entry.state === 'PROBE' ? MAX_UNICAST_SOLICIT : MAX_MULTICAST_SOLICIT;
        if (entry.solicits < max) {
          solicit(now, entry.state === 'PROBE' ? 'ns-unicast' : 'ns-multicast');
        } else {
          entry.state = 'NONE';
          entry.solicits = 0;
          log(now, 'deleted');
        }
      }
      continue;
    }
    sends.shift();
    if (entry.state === 'NONE') {
      entry.state = 'INCOMPLETE';
      log(now, 'send');
      entry.solicits = 0;
      solicit(now, 'ns-multicast');
    } else if (entry.state === 'STALE') {
      // The packet goes out at once to the cached MAC; reachability is checked afterwards.
      entry.state = 'DELAY';
      entry.timerAt = now + DELAY_FIRST_PROBE_TIME_MS;
      log(now, 'send');
    } else {
      log(now, 'send');
    }
  }
  return events;
}

/** The state after the last event at or before `ms`. */
export function stateAt(events: readonly NdEvent[], ms: number): NdState {
  let state: NdState = 'NONE';
  for (const event of events) {
    if (event.atMs > ms) break;
    state = event.state;
  }
  return state;
}

/** Contiguous stretches of one state, for drawing the timeline. */
export function stateSpans(
  events: readonly NdEvent[],
  untilMs: number,
): { readonly state: NdState; readonly fromMs: number; readonly toMs: number }[] {
  const spans: { state: NdState; fromMs: number; toMs: number }[] = [];
  for (const event of events) {
    const last = spans[spans.length - 1];
    if (last && last.state === event.state) continue;
    if (last) last.toMs = event.atMs;
    spans.push({ state: event.state, fromMs: event.atMs, toMs: untilMs });
  }
  return spans.filter((span) => span.toMs > span.fromMs);
}

/** The EUI-64 steps (RFC 4291 Appendix A): split the MAC, insert ff:fe, flip the U/L bit. */
export interface Eui64Steps {
  readonly mac: string;
  /** The 8 bytes after inserting ff:fe in the middle, before the flip. */
  readonly withFffe: string;
  readonly firstByteBefore: number;
  readonly firstByteAfter: number;
  /** The 64-bit interface ID as four hextets. */
  readonly interfaceId: string;
}

export function eui64Steps(mac: string): Eui64Steps {
  const interfaceId = deriveEui64InterfaceId(mac);
  const bytes = mac.toLowerCase().split(':');
  const firstByteBefore = Number.parseInt(bytes[0] ?? '', 16);
  return {
    mac: bytes.join(':'),
    withFffe: [...bytes.slice(0, 3), 'ff', 'fe', ...bytes.slice(3)].join(':'),
    firstByteBefore,
    firstByteAfter: firstByteBefore ^ 0x02,
    interfaceId,
  };
}

/** The SLAAC address from a Prefix Information option and a MAC; SLAAC needs a /64. */
export function slaacAddress(prefix: string, mac: string): string | null {
  const parsed = parseIpv6Cidr(prefix);
  if (parsed.length !== 64) return null;
  const network = parseIpv6(parsed.prefix)
    .hextets.slice(0, 4)
    .map((hextet) => hextet.toString(16));
  return canonicalizeIpv6(`${network.join(':')}:${deriveEui64InterfaceId(mac)}`);
}

export type AddressState = 'tentative' | 'preferred' | 'duplicate';

export interface DadOutcome {
  /** The Neighbor Solicitation the host sends for its own new address. */
  readonly probe: { readonly source: '::'; readonly destination: string; readonly target: string };
  readonly events: readonly { readonly atMs: number; readonly state: AddressState }[];
  readonly usable: boolean;
}

/**
 * Duplicate address detection with the default DupAddrDetectTransmits = 1:
 * one NS from the unspecified address; an NA for the target means another
 * node has it, silence for RetransTimer means the address is ours.
 */
export function dad(address: string, alreadyInUse: boolean): DadOutcome {
  const target = canonicalizeIpv6(address);
  return {
    probe: { source: '::', destination: solicitedNodeAddress(target), target },
    events: alreadyInUse
      ? [
          { atMs: 0, state: 'tentative' },
          { atMs: 0, state: 'duplicate' },
        ]
      : [
          { atMs: 0, state: 'tentative' },
          { atMs: RETRANS_TIMER_MS, state: 'preferred' },
        ],
    usable: !alreadyInUse,
  };
}
