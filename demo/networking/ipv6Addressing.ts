/**
 * The IPv6 addressing lesson (REQ-430): how an address is written (RFC 5952),
 * what kind of address a prefix makes it (RFC 4291, RFC 4193), and how a
 * delegated prefix is cut into one /64 per LAN (RFC 8415 IA_PD, RFC 6177).
 *
 * Simplified: addresses are parsed from hex groups and `::` only (no embedded
 * IPv4 dotted quad, no zone index such as `%eth0`); the classes cover the
 * ranges the lesson teaches, and anything else is `other`. Numbering LANs
 * from subnet ID 0 is a common CPE habit, not a standard.
 */

/** Parses IPv6 text into its 128-bit value, or null when it is not valid. */
export function parseIpv6(text: string): bigint | null {
  const trimmed = text.trim().toLowerCase();
  if (trimmed === '' || /[^0-9a-f:]/.test(trimmed)) return null;
  const halves = trimmed.split('::');
  if (halves.length > 2) return null;
  const groups = (part: string) => (part === '' ? [] : part.split(':'));
  const head = groups(halves[0]!);
  const tail = halves.length === 2 ? groups(halves[1]!) : [];
  const all = [...head, ...tail];
  if (all.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  if (halves.length === 1 && all.length !== 8) return null;
  // `::` stands for at least one zero group (RFC 4291 §2.2).
  if (halves.length === 2 && all.length > 7) return null;
  const hextets = [...head, ...Array(8 - all.length).fill('0'), ...tail];
  return hextets.reduce((value, group) => (value << 16n) | BigInt(parseInt(group, 16)), 0n);
}

function hextetsOf(value: bigint): number[] {
  return Array.from({ length: 8 }, (_, index) =>
    Number((value >> BigInt((7 - index) * 16)) & 0xffffn),
  );
}

/** All eight groups, four digits each: 2001:0db8:0000:…. */
export function expand(value: bigint): string {
  return hextetsOf(value)
    .map((group) => group.toString(16).padStart(4, '0'))
    .join(':');
}

/**
 * RFC 5952 §4: lower case, no leading zeros, and `::` for the longest run of
 * two or more zero groups — the first such run when two are equally long.
 * A single zero group is written `0`.
 */
export function canonical(value: bigint): string {
  const hextets = hextetsOf(value);
  let bestStart = -1;
  let bestLength = 0;
  for (let start = 0; start < 8; start += 1) {
    let length = 0;
    while (start + length < 8 && hextets[start + length] === 0) length += 1;
    if (length >= 2 && length > bestLength) {
      bestStart = start;
      bestLength = length;
    }
  }
  const text = (groups: number[]) => groups.map((group) => group.toString(16)).join(':');
  if (bestStart < 0) return text(hextets);
  return `${text(hextets.slice(0, bestStart))}::${text(hextets.slice(bestStart + bestLength))}`;
}

/** The canonical text of an address written any valid way, or null. */
export function compress(text: string): string | null {
  const value = parseIpv6(text);
  return value === null ? null : canonical(value);
}

export type AddressKind =
  | 'unspecified'
  | 'loopback'
  | 'documentation'
  | 'global'
  | 'link-local'
  | 'ula'
  | 'ula-reserved'
  | 'multicast'
  | 'other';

/** The prefix that makes each kind, most specific first. */
export const KIND_PREFIXES: readonly { readonly kind: AddressKind; readonly prefix: string }[] = [
  { kind: 'unspecified', prefix: '::/128' },
  { kind: 'loopback', prefix: '::1/128' },
  // RFC 3849: inside 2000::/3, but kept for examples and never routed.
  { kind: 'documentation', prefix: '2001:db8::/32' },
  { kind: 'global', prefix: '2000::/3' },
  { kind: 'link-local', prefix: 'fe80::/10' },
  // RFC 4193: fc00::/7, with the L bit set (fd00::/8) for locally assigned.
  { kind: 'ula', prefix: 'fd00::/8' },
  { kind: 'ula-reserved', prefix: 'fc00::/8' },
  { kind: 'multicast', prefix: 'ff00::/8' },
];

function mask(length: number): bigint {
  return length === 0 ? 0n : ((1n << BigInt(length)) - 1n) << BigInt(128 - length);
}

function parsePrefix(prefix: string): { readonly value: bigint; readonly length: number } {
  const [address, length] = prefix.split('/');
  return { value: parseIpv6(address!)!, length: Number(length) };
}

/** Whether `value` lies inside `prefix` (e.g. `fe80::/10`). */
export function inPrefix(value: bigint, prefix: string): boolean {
  const { value: network, length } = parsePrefix(prefix);
  return (value & mask(length)) === (network & mask(length));
}

/** The kind of address, from the first prefix in `KIND_PREFIXES` that holds it. */
export function classify(value: bigint): AddressKind {
  return KIND_PREFIXES.find(({ prefix }) => inPrefix(value, prefix))?.kind ?? 'other';
}

/** How many prefixes of length `inner` fit in one of length `outer`. */
export function subnetCount(outer: number, inner: number): number {
  return 2 ** (inner - outer);
}

/**
 * The /64 for the `lan`-th LAN (1-based) inside a delegated prefix, numbering
 * LANs from subnet ID 0. Null when the delegated prefix has no room for it.
 */
export function lanPrefix(delegated: string, lan: number): string | null {
  const { value, length } = parsePrefix(delegated);
  if (lan < 1 || lan > subnetCount(length, 64)) return null;
  const network = (value & mask(length)) | (BigInt(lan - 1) << 64n);
  return `${canonical(network)}/64`;
}

/** The lesson's delegated prefix: a /56 from the documentation range. */
export const DELEGATED = '2001:db8:1234:5600::/56';
