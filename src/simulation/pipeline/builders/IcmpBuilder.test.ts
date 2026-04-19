import { describe, expect, it } from 'vitest';
import { makePacket } from '../../__fixtures__/helpers';
import { ICMP_TYPE } from '../../icmp';
import { IcmpBuilder } from './IcmpBuilder';

describe('IcmpBuilder', () => {
  const builder = new IcmpBuilder();

  it('buildEchoRequest creates ICMP echo-request packet', () => {
    const packet = builder.buildEchoRequest(
      'client-1',
      'server-1',
      '10.0.0.10',
      '203.0.113.10',
      64,
    );
    expect(packet.srcNodeId).toBe('client-1');
    expect(packet.dstNodeId).toBe('server-1');
    expect(packet.frame.payload.srcIp).toBe('10.0.0.10');
    expect(packet.frame.payload.dstIp).toBe('203.0.113.10');
    expect(packet.frame.payload.ttl).toBe(64);
    expect(packet.frame.payload.protocol).toBe(1);
    expect(packet.frame.payload.payload).toMatchObject({ type: ICMP_TYPE.ECHO_REQUEST });
  });

  it('buildEchoReply creates ICMP echo-reply packet', () => {
    const request = makePacket('req-1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const reply = builder.buildEchoReply(
      'server-1',
      'client-1',
      '203.0.113.10',
      '10.0.0.10',
      request,
    );
    expect(reply.srcNodeId).toBe('server-1');
    expect(reply.dstNodeId).toBe('client-1');
    expect(reply.frame.payload.srcIp).toBe('203.0.113.10');
    expect(reply.frame.payload.dstIp).toBe('10.0.0.10');
    expect(reply.frame.payload.payload).toMatchObject({ type: ICMP_TYPE.ECHO_REPLY });
  });

  it('buildTimeExceeded creates ICMP time-exceeded packet', () => {
    const original = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const icmpPacket = builder.buildTimeExceeded('router-1', '192.168.1.1', original);
    expect(icmpPacket.frame.payload.srcIp).toBe('192.168.1.1');
    expect(icmpPacket.frame.payload.payload).toMatchObject({ type: ICMP_TYPE.TIME_EXCEEDED });
  });

  it('shouldEmitGeneratedIcmp returns false for 0.0.0.0', () => {
    expect(builder.shouldEmitGeneratedIcmp('0.0.0.0')).toBe(false);
  });

  it('shouldEmitGeneratedIcmp returns true for normal IP', () => {
    expect(builder.shouldEmitGeneratedIcmp('10.0.0.10')).toBe(true);
  });

  it('buildFragmentationNeeded creates correct ICMP packet', () => {
    const original = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const icmpPacket = builder.buildFragmentationNeeded('router-1', '192.168.1.1', original, 1400);
    expect(icmpPacket.frame.payload.payload).toMatchObject({
      type: ICMP_TYPE.DESTINATION_UNREACHABLE,
    });
  });

  it('makePacketId returns unique IDs', () => {
    const id1 = builder.makePacketId('test');
    const id2 = builder.makePacketId('test');
    expect(id1).not.toBe(id2);
    expect(id1).toContain('test');
  });
});
