import { describe, expect, it } from 'vitest';
import type { InFlightPacket, UdpDatagram } from '../../types/packets';
import { buildUdpPacket, generateEphemeralPort, type UdpPacketOptions } from './udpPacketBuilder';

function makeOptions(overrides: Partial<UdpPacketOptions> = {}): UdpPacketOptions {
  return {
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.1',
    srcPort: 49152,
    dstPort: 53,
    timestamp: 1000,
    ...overrides,
  };
}

function udpPayload(packet: InFlightPacket): UdpDatagram {
  const payload = packet.frame.payload.payload;
  if (!('srcPort' in payload) || 'seq' in payload) {
    throw new Error('Expected UDP payload');
  }
  return payload;
}

describe('buildUdpPacket', () => {
  it('returns an InFlightPacket with protocol=17', () => {
    const packet = buildUdpPacket(makeOptions());
    expect(packet.frame.payload.protocol).toBe(17);
  });

  it('sets srcPort and dstPort on the UdpDatagram', () => {
    const packet = buildUdpPacket(makeOptions({ srcPort: 12345, dstPort: 67 }));
    expect(udpPayload(packet).srcPort).toBe(12345);
    expect(udpPayload(packet).dstPort).toBe(67);
  });

  it('defaults ttl to 64', () => {
    const packet = buildUdpPacket(makeOptions());
    expect(packet.frame.payload.ttl).toBe(64);
  });

  it('defaults df to false', () => {
    const packet = buildUdpPacket(makeOptions());
    expect(packet.frame.payload.flags).toEqual({ df: false, mf: false });
  });

  it('throws when srcPort < 0', () => {
    expect(() => buildUdpPacket(makeOptions({ srcPort: -1 }))).toThrow(RangeError);
  });

  it('throws when dstPort > 65535', () => {
    expect(() => buildUdpPacket(makeOptions({ dstPort: 65536 }))).toThrow(RangeError);
  });

  it('sets UdpDatagram.length = 8 + JSON.stringify(payload).length', () => {
    const raw = { layer: 'raw' as const, data: 'hello' };
    const packet = buildUdpPacket(makeOptions({ payload: raw }));
    expect(udpPayload(packet).length).toBe(8 + JSON.stringify(raw).length);
  });

  it('carries the payload through untouched (RawPayload case)', () => {
    const raw = { layer: 'raw' as const, data: 'test-data' };
    const packet = buildUdpPacket(makeOptions({ payload: raw }));
    expect(udpPayload(packet).payload).toEqual(raw);
  });

  it('carries the payload through untouched (DhcpMessage case)', () => {
    const dhcp = {
      layer: 'L7' as const,
      messageType: 'DISCOVER' as const,
      transactionId: 0x1234,
      clientMac: 'aa:bb:cc:dd:ee:ff',
      options: {},
    };
    const packet = buildUdpPacket(makeOptions({ payload: dhcp }));
    expect(udpPayload(packet).payload).toEqual(dhcp);
  });

  it('respects ttl override', () => {
    const packet = buildUdpPacket(makeOptions({ ttl: 128 }));
    expect(packet.frame.payload.ttl).toBe(128);
  });

  it('respects df override', () => {
    const packet = buildUdpPacket(makeOptions({ df: true }));
    expect(packet.frame.payload.flags).toEqual({ df: true, mf: false });
  });

  it('uses deterministic packetId when the same options are passed twice', () => {
    const opts = makeOptions({ timestamp: 42 });
    const a = buildUdpPacket(opts);
    const b = buildUdpPacket(opts);
    expect(a.id).toBe(b.id);
  });

  it('wraps in proper EthernetFrame -> IpPacket -> UdpDatagram structure', () => {
    const packet = buildUdpPacket(makeOptions());
    expect(packet.frame.layer).toBe('L2');
    expect(packet.frame.payload.layer).toBe('L3');
    expect(udpPayload(packet).layer).toBe('L4');
  });

  it('defaults to empty raw payload when none is provided', () => {
    const packet = buildUdpPacket(makeOptions());
    expect(udpPayload(packet).payload).toEqual({ layer: 'raw', data: '' });
  });

  it('populates srcNodeId and dstNodeId on InFlightPacket', () => {
    const packet = buildUdpPacket(
      makeOptions({
        srcNodeId: 'host-a',
        dstNodeId: 'host-b',
      }),
    );
    expect(packet.srcNodeId).toBe('host-a');
    expect(packet.dstNodeId).toBe('host-b');
  });

  it('populates sessionId when provided', () => {
    const packet = buildUdpPacket(makeOptions({ sessionId: 'sess-42' }));
    expect(packet.sessionId).toBe('sess-42');
  });

  it('allows custom MAC addresses', () => {
    const packet = buildUdpPacket(
      makeOptions({
        srcMac: '11:22:33:44:55:66',
        dstMac: 'ff:ff:ff:ff:ff:ff',
      }),
    );
    expect(packet.frame.srcMac).toBe('11:22:33:44:55:66');
    expect(packet.frame.dstMac).toBe('ff:ff:ff:ff:ff:ff');
  });

  it('uses zero MAC addresses by default', () => {
    const packet = buildUdpPacket(makeOptions());
    expect(packet.frame.srcMac).toBe('00:00:00:00:00:00');
    expect(packet.frame.dstMac).toBe('00:00:00:00:00:00');
  });

  it('sets etherType to 0x0800 (IPv4)', () => {
    const packet = buildUdpPacket(makeOptions());
    expect(packet.frame.etherType).toBe(0x0800);
  });

  it('sets correct source and destination IPs', () => {
    const packet = buildUdpPacket(
      makeOptions({
        srcIp: '192.168.1.100',
        dstIp: '8.8.8.8',
      }),
    );
    expect(packet.frame.payload.srcIp).toBe('192.168.1.100');
    expect(packet.frame.payload.dstIp).toBe('8.8.8.8');
  });

  it('respects custom packetId', () => {
    const packet = buildUdpPacket(makeOptions({ packetId: 'my-custom-id' }));
    expect(packet.id).toBe('my-custom-id');
  });

  it('respects custom timestamp', () => {
    const packet = buildUdpPacket(makeOptions({ timestamp: 9999 }));
    expect(packet.timestamp).toBe(9999);
  });
});

describe('generateEphemeralPort', () => {
  it('returns a value in [49152, 65535]', () => {
    const port = generateEphemeralPort('node-1', 'seed-a');
    expect(port).toBeGreaterThanOrEqual(49152);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it('is deterministic for the same (nodeId, seed)', () => {
    const a = generateEphemeralPort('node-1', 'seed-a');
    const b = generateEphemeralPort('node-1', 'seed-a');
    expect(a).toBe(b);
  });

  it('differs across different seeds', () => {
    const a = generateEphemeralPort('node-1', 'seed-a');
    const b = generateEphemeralPort('node-1', 'seed-b');
    expect(a).not.toBe(b);
  });

  it('differs across different nodeIds', () => {
    const a = generateEphemeralPort('node-1', 'seed-a');
    const b = generateEphemeralPort('node-2', 'seed-a');
    expect(a).not.toBe(b);
  });
});
