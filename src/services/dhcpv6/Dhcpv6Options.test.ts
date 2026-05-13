import { describe, expect, it } from 'vitest';
import { buildDuidLl, decodeDhcpv6Options, encodeDhcpv6Options } from './Dhcpv6Options';

describe('DHCPv6 options', () => {
  it('encodes DUID-LL and round-trips TLV options', () => {
    const duid = buildDuidLl('02:00:00:00:00:0a');
    expect(duid).toBe('0003000102000000000a');

    const encoded = encodeDhcpv6Options([{ code: 1, value: duid }]);
    expect(decodeDhcpv6Options(encoded)).toEqual([{ code: 1, value: duid }]);
  });
});
