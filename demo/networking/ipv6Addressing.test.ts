/** REQ-430 — IPv6 addresses and prefix planning (TC-2410..TC-2416). */
import { describe, expect, it } from 'vitest';
import {
  DELEGATED,
  classify,
  compress,
  expand,
  lanPrefix,
  parseIpv6,
  subnetCount,
} from './ipv6Addressing';

const kind = (text: string) => classify(parseIpv6(text)!);

describe('TC-2410: RFC 5952 compresses the first of two equally long zero runs', () => {
  it('2001:0db8:0000:0000:0001:0000:0000:0001 is written 2001:db8::1:0:0:1', () => {
    expect(compress('2001:0db8:0000:0000:0001:0000:0000:0001')).toBe('2001:db8::1:0:0:1');
  });
});

describe('TC-2411: the longest zero run wins, and a lone zero group is not compressed', () => {
  it('compresses the longer run even when it comes second', () => {
    expect(compress('2001:db8:0:1:0:0:0:1')).toBe('2001:db8:0:1::1');
  });
  it('writes a single zero group as 0', () => {
    expect(compress('2001:db8:0:1:1:1:1:1')).toBe('2001:db8:0:1:1:1:1:1');
  });
  it('lower-cases and drops leading zeros', () => {
    expect(compress('2001:0DB8:00AB:0000:0000:0000:0000:0010')).toBe('2001:db8:ab::10');
  });
  it('writes all-zero and loopback as :: and ::1', () => {
    expect(compress('0:0:0:0:0:0:0:0')).toBe('::');
    expect(compress('0:0:0:0:0:0:0:1')).toBe('::1');
  });
});

describe('TC-2412: any valid spelling reads back as the same address, invalid text is rejected', () => {
  it('expands :: back to all eight groups', () => {
    expect(expand(parseIpv6('fe80::1')!)).toBe('fe80:0000:0000:0000:0000:0000:0000:0001');
  });
  it('rejects two ::, too many groups, and non-hex digits', () => {
    expect(parseIpv6('2001:db8::1::1')).toBeNull();
    expect(parseIpv6('1:2:3:4:5:6:7:8:9')).toBeNull();
    expect(parseIpv6('1:2:3:4::5:6:7:8')).toBeNull();
    expect(parseIpv6('2001:db8::g')).toBeNull();
  });
});

describe('TC-2413: the leading bits decide the kind of address', () => {
  it('classifies global, link-local, ULA, multicast, loopback and documentation', () => {
    expect(kind('2400:1::1')).toBe('global');
    expect(kind('3fff:ffff::1')).toBe('global');
    expect(kind('fe80::1a2b:3cff:fe4d:5e6f')).toBe('link-local');
    expect(kind('febf::1')).toBe('link-local');
    expect(kind('fec0::1')).toBe('other');
    expect(kind('fd12:3456:789a:1::1')).toBe('ula');
    expect(kind('fc00::1')).toBe('ula-reserved');
    expect(kind('ff02::1')).toBe('multicast');
    expect(kind('::1')).toBe('loopback');
    expect(kind('::')).toBe('unspecified');
    expect(kind('2001:db8::1')).toBe('documentation');
    expect(kind('4000::1')).toBe('other');
  });
});

describe('TC-2414: a /56 holds 256 /64s, a /48 holds 256 /56s', () => {
  it('counts subnets between prefix lengths', () => {
    expect(subnetCount(56, 64)).toBe(256);
    expect(subnetCount(48, 56)).toBe(256);
    expect(subnetCount(48, 64)).toBe(65_536);
    expect(subnetCount(60, 64)).toBe(16);
  });
});

describe('TC-2415: the 4th LAN in 2001:db8:1234:5600::/56 is 2001:db8:1234:5603::/64', () => {
  it('numbers LANs from subnet ID 0', () => {
    expect(lanPrefix(DELEGATED, 1)).toBe('2001:db8:1234:5600::/64');
    expect(lanPrefix(DELEGATED, 4)).toBe('2001:db8:1234:5603::/64');
  });
});

describe('TC-2416: subnet IDs are hex, and a /56 runs out after 256 LANs', () => {
  it('the 11th LAN is :560a, the 256th is :56ff, there is no 257th', () => {
    expect(lanPrefix(DELEGATED, 11)).toBe('2001:db8:1234:560a::/64');
    expect(lanPrefix(DELEGATED, 256)).toBe('2001:db8:1234:56ff::/64');
    expect(lanPrefix(DELEGATED, 257)).toBeNull();
  });
  it('a /60 has room for only 16 LANs', () => {
    expect(lanPrefix('2001:db8:1234:5670::/60', 16)).toBe('2001:db8:1234:567f::/64');
    expect(lanPrefix('2001:db8:1234:5670::/60', 17)).toBeNull();
  });
});
