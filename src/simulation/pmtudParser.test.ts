import { describe, expect, it } from 'vitest';
import type { IcmpMessage, IpPacket } from '../types/packets';
import { buildIpv4HeaderBytes, bytesToRawString, buildTransportBytes } from '../utils/packetLayout';
import { ICMP_CODE, ICMP_TYPE } from './icmp';
import { parseIcmpFragNeeded } from './pmtudParser';

function makeOriginalPacket(): IpPacket {
  return {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 6,
    flags: { df: true, mf: false },
    payload: {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 1000,
      ack: 0,
      flags: {
        syn: false,
        ack: true,
        fin: false,
        rst: false,
        psh: true,
        urg: false,
      },
      payload: {
        layer: 'raw',
        data: 'hello world',
      },
    },
  };
}

function makeQuotedData(packet: IpPacket): string {
  return bytesToRawString([
    ...buildIpv4HeaderBytes(packet),
    ...buildTransportBytes(packet.payload).slice(0, 8),
  ]);
}

function makeFragNeededPacket(
  overrides: Partial<IcmpMessage> = {},
  data: string | undefined = makeQuotedData(makeOriginalPacket()),
): IpPacket {
  return {
    layer: 'L3',
    srcIp: '203.0.113.1',
    dstIp: '10.0.0.10',
    ttl: 64,
    protocol: 1,
    payload: {
      layer: 'L4',
      type: ICMP_TYPE.DESTINATION_UNREACHABLE,
      code: ICMP_CODE.FRAGMENTATION_NEEDED,
      checksum: 0,
      sequenceNumber: 600,
      data,
      ...overrides,
    },
  };
}

describe('parseIcmpFragNeeded', () => {
  it('returns null when icmp.type is not DESTINATION_UNREACHABLE', () => {
    const packet = makeFragNeededPacket({ type: ICMP_TYPE.TIME_EXCEEDED });

    expect(parseIcmpFragNeeded(packet)).toBeNull();
  });

  it('returns null when icmp.code is not FRAGMENTATION_NEEDED', () => {
    const packet = makeFragNeededPacket({ code: ICMP_CODE.HOST_UNREACHABLE });

    expect(parseIcmpFragNeeded(packet)).toBeNull();
  });

  it('returns null when payload is not an IcmpMessage', () => {
    const packet: IpPacket = makeOriginalPacket();

    expect(parseIcmpFragNeeded(packet)).toBeNull();
  });

  it('returns { originalDstIp, nextHopMtu } on a well-formed Frag-Needed packet', () => {
    const packet = makeFragNeededPacket();

    expect(parseIcmpFragNeeded(packet)).toEqual({
      originalDstIp: '203.0.113.10',
      nextHopMtu: 600,
    });
  });

  it('returns null when data is malformed', () => {
    const packet = makeFragNeededPacket({}, 'too-short');

    expect(parseIcmpFragNeeded(packet)).toBeNull();
  });

  it('returns null when sequenceNumber is missing', () => {
    const packet = makeFragNeededPacket({ sequenceNumber: undefined });

    expect(parseIcmpFragNeeded(packet)).toBeNull();
  });
});
