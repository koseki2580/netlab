import { describe, expect, it } from 'vitest';
import { DSCP_CODE_POINTS, dscpFromTos, tosFromDscp } from './packets';

describe('DSCP helpers', () => {
  it('round-trips exported DSCP code points through the IPv4 ToS byte', () => {
    for (const value of Object.values(DSCP_CODE_POINTS)) {
      expect(dscpFromTos(tosFromDscp(value))).toBe(value);
    }
  });

  it('matches RFC 2474 ToS conformance vectors', () => {
    expect(tosFromDscp(46)).toBe(0xb8);
    expect(tosFromDscp(10)).toBe(0x28);
  });

  it('rejects DSCP values outside the six-bit range', () => {
    expect(() => tosFromDscp(-1)).toThrow(RangeError);
    expect(() => tosFromDscp(64)).toThrow(RangeError);
  });
});
