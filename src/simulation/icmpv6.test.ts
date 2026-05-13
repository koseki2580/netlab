import { describe, expect, it } from 'vitest';
import {
  ICMPV6_TYPE,
  buildIcmpv6EchoReply,
  buildIcmpv6EchoRequest,
  buildNeighborAdvertisement,
  buildNeighborSolicitation,
} from './icmpv6';

describe('icmpv6 builders', () => {
  it('builds echo request and reply messages', () => {
    const request = buildIcmpv6EchoRequest({ identifier: 7, sequenceNumber: 3 });
    const reply = buildIcmpv6EchoReply(request);

    expect(request.type).toBe(ICMPV6_TYPE.ECHO_REQUEST);
    expect(reply).toMatchObject({
      type: ICMPV6_TYPE.ECHO_REPLY,
      identifier: 7,
      sequenceNumber: 3,
    });
  });

  it('builds NDP solicit and advertisement messages with canonical target addresses', () => {
    expect(buildNeighborSolicitation('FE80::0001', '02:00:00:00:00:01')).toMatchObject({
      type: ICMPV6_TYPE.NEIGHBOR_SOLICITATION,
      targetAddress: 'fe80::1',
    });
    expect(buildNeighborAdvertisement('FE80::0001', '02:00:00:00:00:01')).toMatchObject({
      type: ICMPV6_TYPE.NEIGHBOR_ADVERTISEMENT,
      targetAddress: 'fe80::1',
      targetMac: '02:00:00:00:00:01',
    });
  });
});
