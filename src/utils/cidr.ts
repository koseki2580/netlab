import { getRequired } from './typedAccess';
import { isInIpv6Subnet, isIpv6Address, parseIpv6Cidr } from './ipv6';

export function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

export function intToIp(value: number): string {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join(
    '.',
  );
}

export function networkAddress(ip: string, prefix: number): string {
  if (prefix === 0) return '0.0.0.0';
  const mask = (~0 << (32 - prefix)) >>> 0;
  return intToIp(ipToInt(ip) & mask);
}

export function isInSubnet(ip: string, cidr: string): boolean {
  const ipIsV6 = isIpv6Address(ip);
  const cidrIsV6 = cidr.includes(':');
  if (ipIsV6 !== cidrIsV6) {
    return false;
  }
  if (ipIsV6) {
    return isInIpv6Subnet(ip, cidr);
  }
  const parts = cidr.split('/');
  const prefix = getRequired(parts, 0, { cidr });
  const lengthStr = getRequired(parts, 1, { cidr });
  const length = parseInt(lengthStr, 10);
  if (length === 0) return true; // 0.0.0.0/0 matches everything
  const mask = (~0 << (32 - length)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(prefix) & mask);
}

export function parseCidr(cidr: string): { prefix: string; length: number } {
  if (cidr.includes(':')) {
    const parsed = parseIpv6Cidr(cidr);
    return { prefix: parsed.prefix, length: parsed.length };
  }
  const parts = cidr.split('/');
  const prefix = getRequired(parts, 0, { cidr });
  const lengthStr = getRequired(parts, 1, { cidr });
  return { prefix, length: parseInt(lengthStr, 10) };
}

export function isInSameSubnet(cidr1: string, cidr2: string): boolean {
  const first = parseCidr(cidr1);
  const second = parseCidr(cidr2);

  if (first.length !== second.length) {
    return false;
  }

  if (first.prefix.includes(':') || second.prefix.includes(':')) {
    return isInIpv6Subnet(first.prefix, `${second.prefix}/${second.length}`);
  }

  return (
    networkAddress(first.prefix, first.length) === networkAddress(second.prefix, second.length)
  );
}

export function prefixLength(cidr: string): number {
  const parts = cidr.split('/');
  return parseInt(getRequired(parts, 1, { cidr }), 10);
}

/**
 * Every derivable fact about an IPv4 subnet. `firstUsableHost`/`lastUsableHost`
 * are `null` and `usableHostCount` is `0` for `/31` and `/32`, matching the
 * host-count convention taught in introductory courses.
 */
export interface SubnetFacts {
  readonly cidr: string;
  readonly prefix: number;
  readonly mask: string;
  readonly wildcard: string;
  readonly networkAddress: string;
  readonly broadcastAddress: string;
  readonly firstUsableHost: string | null;
  readonly lastUsableHost: string | null;
  readonly usableHostCount: number;
  readonly totalAddresses: number;
}

/** Subnet mask as a 32-bit integer; `/0` is all-zeros (JS shifts mod 32). */
export function maskInt(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/** Every fact about the IPv4 subnet that contains `ip` at `prefix`. */
export function subnetFacts(ip: string, prefix: number): SubnetFacts {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new RangeError(`prefix must be an integer in 0..32, got ${prefix}`);
  }

  const mask = maskInt(prefix);
  const network = networkAddress(ip, prefix);
  const networkInt = ipToInt(network);
  const broadcastInt = (networkInt | ((~mask >>> 0) & 0xffffffff)) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);
  const hasUsableRange = prefix <= 30;

  return {
    cidr: `${network}/${prefix}`,
    prefix,
    mask: intToIp(mask),
    wildcard: intToIp((~mask >>> 0) & 0xffffffff),
    networkAddress: network,
    broadcastAddress: intToIp(broadcastInt),
    firstUsableHost: hasUsableRange ? intToIp((networkInt + 1) >>> 0) : null,
    lastUsableHost: hasUsableRange ? intToIp((broadcastInt - 1) >>> 0) : null,
    usableHostCount: hasUsableRange ? totalAddresses - 2 : 0,
    totalAddresses,
  };
}

/**
 * Which reserved address of its own subnet `ip` is at `prefix`: the network
 * or the broadcast address, which no device may take. Null for an ordinary
 * host address, and always at /31 and /32, which have no such addresses.
 */
export function reservedAddressKind(ip: string, prefix: number): 'network' | 'broadcast' | null {
  if (prefix < 0 || prefix > 30) return null;
  const facts = subnetFacts(ip, prefix);
  return ip === facts.networkAddress
    ? 'network'
    : ip === facts.broadcastAddress
      ? 'broadcast'
      : null;
}
