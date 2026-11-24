/**
 * The DHCP lease lesson (REQ-431): what a DHCPv4 client does over the life of
 * its lease when its server dies (RFC 2131 §4.4.5).
 *
 * - T1 = 0.5 × lease: the client enters RENEWING and unicasts a DHCPREQUEST
 *   to the server that gave it the lease.
 * - T2 = 0.875 × lease: no answer yet, so it enters REBINDING and broadcasts
 *   the DHCPREQUEST, which any server may answer.
 * - Expiry: no answer at all, so it stops using the address and starts over
 *   from INIT with a DHCPDISCOVER.
 *
 * Unanswered requests are retried as RFC 2131 suggests: after half the time
 * left until T2 (renewing) or until expiry (rebinding), but never sooner than
 * 60 s; a retry that would fall on or after the next stage is not sent.
 *
 * Simplified: T1 and T2 are the RFC defaults (a server may send other values
 * in options 58 and 59); waits are whole seconds; the network never loses a
 * packet, so only a dead server leaves a request unanswered; server B, when
 * present, already knows this client's lease (as a failover partner would) and
 * answers broadcasts only, so it never answers a renew sent to server A.
 */

export const T1_FRACTION = 0.5;
export const T2_FRACTION = 0.875;
export const MIN_RETRY_S = 60;

export type LeaseEventKind = 'ack' | 'server-down' | 'renew' | 'rebind' | 'expire' | 'discover';

export interface LeaseEvent {
  /** Seconds since the client's first lease. */
  readonly atS: number;
  readonly kind: LeaseEventKind;
  /** Which server answered a renew/rebind/discover, or null when none did. */
  readonly answeredBy: 'A' | 'B' | null;
}

export interface LeaseTimes {
  readonly t1S: number;
  readonly t2S: number;
  readonly expiryS: number;
}

/** When a lease granted at `startS` reaches T1, T2 and its end. */
export function leaseTimes(leaseS: number, startS = 0): LeaseTimes {
  return {
    t1S: startS + Math.round(leaseS * T1_FRACTION),
    t2S: startS + Math.round(leaseS * T2_FRACTION),
    expiryS: startS + leaseS,
  };
}

/** The send times of the requests in one stage, from `fromS` until (not including) `untilS`. */
export function retryTimes(fromS: number, untilS: number): number[] {
  const times: number[] = [];
  let at = fromS;
  while (at < untilS) {
    times.push(at);
    at += Math.max(MIN_RETRY_S, Math.floor((untilS - at) / 2));
  }
  return times;
}

export interface LeaseScenario {
  /** Lease length, seconds. */
  readonly leaseS: number;
  /** When server A dies, seconds after the first lease. */
  readonly serverDownS: number;
  /** Whether a second server, B, can answer the broadcast rebind. */
  readonly serverB: boolean;
}

export interface LeaseOutcome {
  readonly events: readonly LeaseEvent[];
  /** The first request the client sends that goes unanswered. */
  readonly firstUnansweredS: number;
  /** When the client lost its address, or null if it kept it. */
  readonly addressLostS: number | null;
  /** Who holds the client's lease at the end: A, B, or nobody. */
  readonly leaseFrom: 'A' | 'B' | null;
  /** The lease in force at the end (its T1/T2/expiry), or the last one before the address was lost. */
  readonly lastLease: LeaseTimes;
}

/** Follow the client from its first lease until it is rebound by B or loses its address. */
export function simulateLease(scenario: LeaseScenario): LeaseOutcome {
  const { leaseS, serverDownS, serverB } = scenario;
  const events: LeaseEvent[] = [{ atS: 0, kind: 'ack', answeredBy: 'A' }];
  const aliveAt = (atS: number) => atS < serverDownS;
  let lease = leaseTimes(leaseS, 0);
  let firstUnansweredS: number | null = null;
  let downLogged = false;
  const logDown = (beforeS: number) => {
    if (!downLogged && serverDownS <= beforeS) {
      events.push({ atS: serverDownS, kind: 'server-down', answeredBy: null });
      downLogged = true;
    }
  };

  // Each pass is one lease; a renewal starts the next pass. The server dies
  // eventually, so the loop ends; the bound only guards against a bad input.
  for (let pass = 0; pass < 1000; pass += 1) {
    let renewed = false;
    for (const atS of retryTimes(lease.t1S, lease.t2S)) {
      logDown(atS);
      if (aliveAt(atS)) {
        events.push({ atS, kind: 'renew', answeredBy: 'A' });
        lease = leaseTimes(leaseS, atS);
        renewed = true;
        break;
      }
      events.push({ atS, kind: 'renew', answeredBy: null });
      firstUnansweredS ??= atS;
    }
    if (renewed) continue;

    for (const atS of retryTimes(lease.t2S, lease.expiryS)) {
      logDown(atS);
      if (serverB) {
        events.push({ atS, kind: 'rebind', answeredBy: 'B' });
        return {
          events,
          firstUnansweredS: firstUnansweredS ?? atS,
          addressLostS: null,
          leaseFrom: 'B',
          lastLease: leaseTimes(leaseS, atS),
        };
      }
      events.push({ atS, kind: 'rebind', answeredBy: null });
    }
    events.push({ atS: lease.expiryS, kind: 'expire', answeredBy: null });
    events.push({ atS: lease.expiryS, kind: 'discover', answeredBy: null });
    return {
      events,
      firstUnansweredS: firstUnansweredS ?? lease.t1S,
      addressLostS: lease.expiryS,
      leaseFrom: null,
      lastLease: lease,
    };
  }
  throw new Error('the server never failed');
}
