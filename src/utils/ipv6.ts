import { getRequired } from './typedAccess';

export interface ParsedIpv6Address {
  readonly canonical: string;
  readonly hextets: readonly number[];
  readonly bigint: bigint;
}

const FULL_HEXTET_COUNT = 8;
const MAX_IPV6 = (1n << 128n) - 1n;

function parseHextet(part: string): number {
  if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
    throw new RangeError(`Invalid IPv6 hextet: ${part}`);
  }
  return Number.parseInt(part, 16);
}

function expandIpv6(address: string): number[] {
  const input = address.trim().toLowerCase();
  if (!input) {
    throw new RangeError('IPv6 address must not be empty');
  }

  const doubleColonCount = input.split('::').length - 1;
  if (doubleColonCount > 1) {
    throw new RangeError(`Invalid IPv6 address: ${address}`);
  }

  if (doubleColonCount === 0) {
    const hextets = input.split(':').map(parseHextet);
    if (hextets.length !== FULL_HEXTET_COUNT) {
      throw new RangeError(`IPv6 address must have 8 hextets without :: compression: ${address}`);
    }
    return hextets;
  }

  const parts = input.split('::');
  const left = getRequired(parts, 0, { address });
  const right = getRequired(parts, 1, { address });
  const leftHextets = left ? left.split(':').map(parseHextet) : [];
  const rightHextets = right ? right.split(':').map(parseHextet) : [];
  const missing = FULL_HEXTET_COUNT - leftHextets.length - rightHextets.length;
  if (missing < 1) {
    throw new RangeError(`Invalid IPv6 compression: ${address}`);
  }
  return [...leftHextets, ...Array.from({ length: missing }, () => 0), ...rightHextets];
}

function hextetsToBigInt(hextets: readonly number[]): bigint {
  return hextets.reduce((acc, part) => (acc << 16n) | BigInt(part), 0n);
}

function findBestZeroRun(hextets: readonly number[]): { start: number; length: number } | null {
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  for (let index = 0; index <= hextets.length; index += 1) {
    if (hextets[index] === 0) {
      if (currentStart < 0) currentStart = index;
      currentLength += 1;
      continue;
    }

    if (currentLength > bestLength && currentLength >= 2) {
      bestStart = currentStart;
      bestLength = currentLength;
    }
    currentStart = -1;
    currentLength = 0;
  }

  return bestStart >= 0 ? { start: bestStart, length: bestLength } : null;
}

function canonicalFromHextets(hextets: readonly number[]): string {
  const bestRun = findBestZeroRun(hextets);
  if (!bestRun) {
    return hextets.map((part) => part.toString(16)).join(':');
  }

  const parts: string[] = [];
  for (let index = 0; index < hextets.length; index += 1) {
    if (index === bestRun.start) {
      parts.push('');
      index += bestRun.length - 1;
      if (index === hextets.length - 1) {
        parts.push('');
      }
      continue;
    }
    parts.push(hextets[index]?.toString(16) ?? '0');
  }
  if (bestRun.start === 0) {
    parts.unshift('');
  }
  return parts.join(':');
}

export function parseIpv6(address: string): ParsedIpv6Address {
  const hextets = expandIpv6(address);
  return {
    canonical: canonicalFromHextets(hextets),
    hextets,
    bigint: hextetsToBigInt(hextets),
  };
}

export function canonicalizeIpv6(address: string): string {
  return parseIpv6(address).canonical;
}

export function isIpv6Address(value: string): boolean {
  if (!value.includes(':')) return false;
  try {
    parseIpv6(value);
    return true;
  } catch {
    return false;
  }
}

export function prefixLength6(cidr: string): number {
  const parts = cidr.split('/');
  const length = Number.parseInt(getRequired(parts, 1, { cidr }), 10);
  if (!Number.isInteger(length) || length < 0 || length > 128) {
    throw new RangeError(`IPv6 prefix length must be in [0, 128], got ${length}`);
  }
  return length;
}

export function parseIpv6Cidr(cidr: string): { prefix: string; length: number; network: bigint } {
  const parts = cidr.split('/');
  const prefix = canonicalizeIpv6(getRequired(parts, 0, { cidr }));
  const length = prefixLength6(cidr);
  const mask = length === 0 ? 0n : (MAX_IPV6 << BigInt(128 - length)) & MAX_IPV6;
  return {
    prefix,
    length,
    network: parseIpv6(prefix).bigint & mask,
  };
}

export function isInIpv6Subnet(address: string, cidr: string): boolean {
  const parsed = parseIpv6(address);
  const route = parseIpv6Cidr(cidr);
  if (route.length === 0) return true;
  const mask = (MAX_IPV6 << BigInt(128 - route.length)) & MAX_IPV6;
  return (parsed.bigint & mask) === route.network;
}

export function deriveEui64InterfaceId(macAddress: string): string {
  const octets = macAddress.split(':').map((part) => Number.parseInt(part, 16));
  if (
    octets.length !== 6 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    throw new RangeError(`Invalid MAC address: ${macAddress}`);
  }
  octets[0] = (octets[0] ?? 0) ^ 0x02;
  const eui64 = [octets[0], octets[1], octets[2], 0xff, 0xfe, octets[3], octets[4], octets[5]];
  const hextets = [
    ((eui64[0] ?? 0) << 8) | (eui64[1] ?? 0),
    ((eui64[2] ?? 0) << 8) | (eui64[3] ?? 0),
    ((eui64[4] ?? 0) << 8) | (eui64[5] ?? 0),
    ((eui64[6] ?? 0) << 8) | (eui64[7] ?? 0),
  ];
  return hextets.map((part) => part.toString(16)).join(':');
}
