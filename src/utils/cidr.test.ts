import { describe, it, expect } from 'vitest';
import {
  isInSameSubnet,
  isInSubnet,
  parseCidr,
  prefixLength,
  reservedAddressKind,
  subnetFacts,
} from './cidr';

describe('isInSubnet', () => {
  it('matches IP within /24 subnet', () => {
    expect(isInSubnet('10.0.0.10', '10.0.0.0/24')).toBe(true);
  });

  it('rejects IP outside /24 subnet', () => {
    expect(isInSubnet('10.0.1.10', '10.0.0.0/24')).toBe(false);
  });

  it('matches IP within /16 subnet', () => {
    expect(isInSubnet('192.168.5.1', '192.168.0.0/16')).toBe(true);
  });

  it('rejects IP outside /16 subnet', () => {
    expect(isInSubnet('192.169.0.1', '192.168.0.0/16')).toBe(false);
  });

  it('matches boundary address (network address)', () => {
    expect(isInSubnet('10.0.0.0', '10.0.0.0/24')).toBe(true);
  });

  it('matches boundary address (broadcast address)', () => {
    expect(isInSubnet('10.0.0.255', '10.0.0.0/24')).toBe(true);
  });

  it('matches /32 (host route) for exact IP', () => {
    expect(isInSubnet('203.0.113.10', '203.0.113.10/32')).toBe(true);
  });

  it('rejects /32 for different IP', () => {
    expect(isInSubnet('203.0.113.11', '203.0.113.10/32')).toBe(false);
  });

  it('matches everything for 0.0.0.0/0 (default route)', () => {
    expect(isInSubnet('1.2.3.4', '0.0.0.0/0')).toBe(true);
    expect(isInSubnet('255.255.255.255', '0.0.0.0/0')).toBe(true);
  });
});

describe('parseCidr', () => {
  it('parses a /24 CIDR correctly', () => {
    expect(parseCidr('10.0.0.0/24')).toEqual({ prefix: '10.0.0.0', length: 24 });
  });

  it('parses a /16 CIDR correctly', () => {
    expect(parseCidr('192.168.0.0/16')).toEqual({ prefix: '192.168.0.0', length: 16 });
  });

  it('parses a /0 CIDR correctly', () => {
    expect(parseCidr('0.0.0.0/0')).toEqual({ prefix: '0.0.0.0', length: 0 });
  });
});

describe('prefixLength', () => {
  it('returns 24 for /24', () => {
    expect(prefixLength('10.0.0.0/24')).toBe(24);
  });

  it('returns 0 for /0', () => {
    expect(prefixLength('0.0.0.0/0')).toBe(0);
  });

  it('returns 32 for /32', () => {
    expect(prefixLength('192.168.1.1/32')).toBe(32);
  });
});

describe('isInSameSubnet', () => {
  it('returns true for CIDRs in the same subnet', () => {
    expect(isInSameSubnet('10.0.0.1/24', '10.0.0.2/24')).toBe(true);
  });

  it('returns false for CIDRs in different subnets', () => {
    expect(isInSameSubnet('10.0.0.1/24', '10.0.1.1/24')).toBe(false);
  });

  it('returns false for different prefix lengths', () => {
    expect(isInSameSubnet('10.0.0.1/24', '10.0.0.2/25')).toBe(false);
  });

  it('returns true for an exact /32 match', () => {
    expect(isInSameSubnet('203.0.113.10/32', '203.0.113.10/32')).toBe(true);
  });
});

describe('subnet facts', () => {
  // TC-830: the network and broadcast address of a prefix, as the simulator
  // reads them to refuse a device address.
  it('TC-830: names the network and broadcast address of the prefix, and nothing else', () => {
    expect(reservedAddressKind('192.168.1.0', 24)).toBe('network');
    expect(reservedAddressKind('192.168.1.255', 24)).toBe('broadcast');
    expect(reservedAddressKind('192.168.1.10', 24)).toBeNull();
    expect(reservedAddressKind('10.0.1.0', 23)).toBeNull();
    expect(reservedAddressKind('10.0.1.255', 23)).toBe('broadcast');
    expect(reservedAddressKind('10.0.12.0', 31)).toBeNull();
    expect(reservedAddressKind('10.0.12.1', 32)).toBeNull();
  });

  it('gives every fact about a subnet', () => {
    expect(subnetFacts('192.168.1.37', 24)).toMatchObject({
      networkAddress: '192.168.1.0',
      broadcastAddress: '192.168.1.255',
      firstUsableHost: '192.168.1.1',
      lastUsableHost: '192.168.1.254',
      usableHostCount: 254,
    });
  });
});
