import { describe, expect, it } from 'vitest';
import {
  canonicalizeIpv6,
  deriveEui64InterfaceId,
  isInIpv6Subnet,
  parseIpv6,
  prefixLength6,
} from './ipv6';
import { isInSubnet } from './cidr';

describe('ipv6 utilities', () => {
  it.each([
    ['::1', '::1'],
    ['2001:0db8:0000:0000:0000:ff00:0042:8329', '2001:db8::ff00:42:8329'],
    ['2001:db8:0:1:0:0:0:1', '2001:db8:0:1::1'],
    ['FE80:0000:0000:0000:0202:B3FF:FE1E:8329', 'fe80::202:b3ff:fe1e:8329'],
  ])('canonicalizes %s', (input, expected) => {
    expect(canonicalizeIpv6(input)).toBe(expected);
    expect(parseIpv6(input).canonical).toBe(expected);
  });

  it('checks IPv6 CIDR membership with 128-bit prefixes', () => {
    expect(isInIpv6Subnet('2001:db8:0:1::10', '2001:db8:0:1::/64')).toBe(true);
    expect(isInIpv6Subnet('2001:db8:0:2::10', '2001:db8:0:1::/64')).toBe(false);
    expect(isInIpv6Subnet('::1', '::/0')).toBe(true);
  });

  it('returns false instead of parsing when IPv4 and IPv6 CIDR families differ', () => {
    expect(isInSubnet('2001:db8::1', '10.0.0.0/24')).toBe(false);
    expect(isInSubnet('10.0.0.1', '2001:db8::/64')).toBe(false);
  });

  it('extracts IPv6 prefix length from CIDR', () => {
    expect(prefixLength6('2001:db8::/48')).toBe(48);
  });

  it('derives modified EUI-64 interface IDs from MAC addresses', () => {
    expect(deriveEui64InterfaceId('00:25:96:12:34:56')).toBe('225:96ff:fe12:3456');
  });
});
