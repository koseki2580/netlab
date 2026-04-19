import { describe, expect, it } from 'vitest';
import { computeFcs, computeIpv4Checksum } from './checksum';

describe('computeIpv4Checksum', () => {
  it('returns 0 when the header already contains the correct checksum', () => {
    const header = [
      0x45, 0x00, 0x00, 0x73, 0x00, 0x00, 0x40, 0x00, 0x40, 0x11, 0xb8, 0x61, 0xc0, 0xa8, 0x00,
      0x01, 0xc0, 0xa8, 0x00, 0xc7,
    ];

    expect(computeIpv4Checksum(header)).toBe(0);
  });

  it('produces the expected checksum for a known IPv4 header', () => {
    const header = [
      0x45, 0x00, 0x00, 0x73, 0x00, 0x00, 0x40, 0x00, 0x40, 0x11, 0x00, 0x00, 0xc0, 0xa8, 0x00,
      0x01, 0xc0, 0xa8, 0x00, 0xc7,
    ];

    expect(computeIpv4Checksum(header)).toBe(0xb861);
  });

  it('changes when the TTL changes', () => {
    const header = [
      0x45, 0x00, 0x00, 0x73, 0x00, 0x00, 0x40, 0x00, 0x40, 0x11, 0x00, 0x00, 0xc0, 0xa8, 0x00,
      0x01, 0xc0, 0xa8, 0x00, 0xc7,
    ];
    const decrementedTtl = [...header];
    decrementedTtl[8] = 0x3f;

    expect(computeIpv4Checksum(decrementedTtl)).not.toBe(computeIpv4Checksum(header));
  });
});

describe('computeFcs', () => {
  it('returns a 32-bit unsigned CRC value', () => {
    const fcs = computeFcs([0xde, 0xad, 0xbe, 0xef]);
    expect(fcs).toBeGreaterThanOrEqual(0);
    expect(fcs).toBeLessThanOrEqual(0xffffffff);
  });

  it('matches the standard CRC-32 test vector for "123456789"', () => {
    const bytes = Array.from(new TextEncoder().encode('123456789'));
    expect(computeFcs(bytes)).toBe(0xcbf43926);
  });
});
