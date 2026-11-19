/**
 * The Happy Eyeballs and NAT64 lesson (REQ-386).
 *
 * Happy Eyeballs v2 (RFC 8305): a dual-stack client tries IPv6 first and, if
 * it has not connected within the Connection Attempt Delay (250 ms
 * recommended), starts IPv4 too; the first to connect wins. Simplified: the
 * AAAA and A answers arrive together, and a connection takes one round trip.
 *
 * NAT64/DNS64 (RFC 6146, 6147): on an IPv6-only network, DNS64 makes up an
 * AAAA for an IPv4-only name by putting the IPv4 address in the well-known
 * prefix 64:ff9b::/96 (RFC 6052), and the NAT64 turns the packet into IPv4.
 */
export type Scenario = 'v6-ok' | 'v6-broken' | 'v6-slow';
export const SCENARIOS: readonly Scenario[] = ['v6-ok', 'v6-broken', 'v6-slow'];

/** RFC 8305 §5's recommended Connection Attempt Delay, ms. */
export const ATTEMPT_DELAY_MS = 250;
/** How long a client that tries one address at a time waits on a dead one: a common OS default. */
export const NAIVE_TIMEOUT_MS = 21_000;

/** Round trip to the server over each family, ms; null when packets vanish. */
export const RTT: Record<Scenario, { readonly v6: number | null; readonly v4: number }> = {
  'v6-ok': { v6: 20, v4: 30 },
  'v6-broken': { v6: null, v4: 30 },
  'v6-slow': { v6: 300, v4: 30 },
};

export interface Outcome {
  readonly family: 'IPv6' | 'IPv4';
  /** When the connection is up, ms after the first attempt. */
  readonly connectedMs: number;
}

/** Happy Eyeballs: IPv6 at 0, IPv4 at 250 ms if IPv6 is not up yet; the first wins. */
export function happyEyeballs(scenario: Scenario): Outcome {
  const { v6, v4 } = RTT[scenario];
  if (v6 !== null && v6 <= ATTEMPT_DELAY_MS) return { family: 'IPv6', connectedMs: v6 };
  const viaV4 = ATTEMPT_DELAY_MS + v4;
  if (v6 !== null && v6 <= viaV4) return { family: 'IPv6', connectedMs: v6 };
  return { family: 'IPv4', connectedMs: viaV4 };
}

/** A client that tries IPv6, waits for it to succeed or time out, then tries IPv4. */
export function oneAtATime(scenario: Scenario): Outcome {
  const { v6, v4 } = RTT[scenario];
  if (v6 !== null) return { family: 'IPv6', connectedMs: v6 };
  return { family: 'IPv4', connectedMs: NAIVE_TIMEOUT_MS + v4 };
}

/** DNS64: the IPv4 address in the last 32 bits of 64:ff9b::/96, written as two hex groups. */
export function synthesize(ipv4: string): string {
  const [a, b, c, d] = ipv4.split('.').map(Number) as [number, number, number, number];
  return `64:ff9b::${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
}

/** NAT64: the IPv4 address a synthesized one stands for. */
export function embeddedIpv4(ipv6: string): string {
  const [high = '0', low = '0'] = ipv6.replace('64:ff9b::', '').split(':');
  const h = parseInt(high, 16);
  const l = parseInt(low, 16);
  return [h >> 8, h & 0xff, l >> 8, l & 0xff].join('.');
}

export const CLIENT_V6 = '2001:db8:1::10';
export const NAT64_POOL_V4 = '203.0.113.1';

export interface Translation {
  readonly v6: { readonly src: string; readonly dst: string };
  readonly v4: { readonly src: string; readonly dst: string };
}

/** The client's packet before and after the NAT64. */
export function translate(siteV4: string): Translation {
  const dst = synthesize(siteV4);
  return {
    v6: { src: CLIENT_V6, dst },
    v4: { src: NAT64_POOL_V4, dst: embeddedIpv4(dst) },
  };
}
