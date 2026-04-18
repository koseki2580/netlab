import { describe, expect, it } from 'vitest';
import { ICMP_CODE, ICMP_TYPE } from './icmp';

describe('ICMP_TYPE', () => {
  it('matches the expected RFC values', () => {
    expect(ICMP_TYPE).toEqual({
      ECHO_REPLY: 0,
      DESTINATION_UNREACHABLE: 3,
      ECHO_REQUEST: 8,
      TIME_EXCEEDED: 11,
    });
  });
});

describe('ICMP_CODE', () => {
  it('matches the expected RFC values', () => {
    expect(ICMP_CODE).toEqual({
      NET_UNREACHABLE: 0,
      HOST_UNREACHABLE: 1,
      TTL_EXCEEDED_IN_TRANSIT: 0,
      FRAGMENTATION_NEEDED: 4,
    });
  });
});
