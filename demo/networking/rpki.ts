/**
 * The RPKI route origin validation lesson (REQ-397): how a router classifies
 * a BGP announcement against ROAs (RFC 6811) and what dropping Invalid routes
 * changes for forwarding.
 *
 * Simplified: IPv4 only; the ROAs are given directly as validated payloads
 * (prefix, maxLength, origin AS), as a router would receive them from an RPKI
 * validator; the origin AS is the last AS of the path; AS 0 ROAs and AS_SET
 * origins are not modelled. Only the origin is checked, never the rest of the
 * AS path.
 */

export interface Prefix {
  /** The network address as an unsigned 32-bit number. */
  readonly address: number;
  readonly length: number;
}

export interface Roa {
  readonly prefix: string;
  readonly maxLength: number;
  readonly originAs: number;
}

export interface Announcement {
  readonly id: string;
  readonly prefix: string;
  readonly originAs: number;
}

export type ValidationState = 'Valid' | 'Invalid' | 'NotFound';

/** Why an announcement got its state. */
export type Reason = 'match' | 'wrong-origin' | 'too-long' | 'no-roa';

export interface Validation {
  readonly state: ValidationState;
  readonly reason: Reason;
  /** The ROAs whose prefix covers the announcement. */
  readonly covering: readonly Roa[];
  /** The ROA that made it Valid, if any. */
  readonly matched: Roa | null;
}

export const ROAS: readonly Roa[] = [
  { prefix: '192.0.2.0/24', maxLength: 24, originAs: 64500 },
  { prefix: '198.51.100.0/22', maxLength: 24, originAs: 64501 },
];

export const ANNOUNCEMENTS: readonly Announcement[] = [
  { id: 'own-24', prefix: '192.0.2.0/24', originAs: 64500 },
  { id: 'other-origin-24', prefix: '192.0.2.0/24', originAs: 64511 },
  { id: 'other-origin-25', prefix: '192.0.2.0/25', originAs: 64511 },
  { id: 'within-max', prefix: '198.51.100.0/24', originAs: 64501 },
  { id: 'beyond-max', prefix: '198.51.100.0/25', originAs: 64501 },
  { id: 'no-roa', prefix: '203.0.113.0/24', originAs: 64502 },
];

/** The announcement the learner predicts: a more-specific with another origin. */
export const ASKED_ID = 'other-origin-25';

export function parseAddress(text: string): number {
  const parts = text.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    throw new Error(`not an IPv4 address: ${text}`);
  }
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

const mask = (length: number) => (length === 0 ? 0 : (0xffffffff << (32 - length)) >>> 0);

export function parsePrefix(text: string): Prefix {
  const [address, length] = text.split('/');
  const len = Number(length);
  if (!Number.isInteger(len) || len < 0 || len > 32) throw new Error(`not a prefix: ${text}`);
  return { address: (parseAddress(address!) & mask(len)) >>> 0, length: len };
}

/** Whether `outer` covers `inner`: inner is outer itself or a more-specific of it. */
export function covers(outer: Prefix, inner: Prefix): boolean {
  return (
    inner.length >= outer.length && (inner.address & mask(outer.length)) >>> 0 === outer.address
  );
}

/** RFC 6811: Valid if a covering ROA matches origin and length; Invalid if covered but none match; else NotFound. */
export function validate(announcement: Announcement, roas: readonly Roa[]): Validation {
  const route = parsePrefix(announcement.prefix);
  const covering = roas.filter((roa) => covers(parsePrefix(roa.prefix), route));
  if (covering.length === 0)
    return { state: 'NotFound', reason: 'no-roa', covering, matched: null };
  const matched =
    covering.find(
      (roa) => roa.originAs === announcement.originAs && route.length <= roa.maxLength,
    ) ?? null;
  if (matched) return { state: 'Valid', reason: 'match', covering, matched };
  const sameOrigin = covering.some((roa) => roa.originAs === announcement.originAs);
  return {
    state: 'Invalid',
    reason: sameOrigin ? 'too-long' : 'wrong-origin',
    covering,
    matched: null,
  };
}

export type Policy = 'accept-all' | 'drop-invalid';

export interface ForwardingResult {
  /** The routes the router keeps, with their states. */
  readonly installed: readonly (Announcement & { readonly state: ValidationState })[];
  /** The longest installed prefix that contains the destination, or null. */
  readonly chosen: (Announcement & { readonly state: ValidationState }) | null;
}

/** Which route forwarding uses for `destination`, after applying `policy` to `announcements`. */
export function forward(
  announcements: readonly Announcement[],
  roas: readonly Roa[],
  destination: string,
  policy: Policy,
): ForwardingResult {
  const installed = announcements
    .map((a) => ({ ...a, state: validate(a, roas).state }))
    .filter((a) => policy === 'accept-all' || a.state !== 'Invalid');
  const dest = parseAddress(destination);
  let chosen: ForwardingResult['chosen'] = null;
  for (const route of installed) {
    const prefix = parsePrefix(route.prefix);
    if (!covers(prefix, { address: dest, length: 32 })) continue;
    if (!chosen || prefix.length > parsePrefix(chosen.prefix).length) chosen = route;
  }
  return { installed, chosen };
}

/** The two routes a router hears for 192.0.2.0: the owner's /24 and another origin's /25. */
export const COMPETING: readonly Announcement[] = ANNOUNCEMENTS.filter(
  (a) => a.id === 'own-24' || a.id === 'other-origin-25',
);
