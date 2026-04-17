import { describe, expect, it } from 'vitest';
import type { InFlightPacket, TcpSegment } from '../../types/packets';
import {
  buildAckPacket,
  buildFinPacket,
  buildRstPacket,
  buildSynAckPacket,
  buildSynPacket,
  generateISN,
  type TcpPacketOptions,
} from './tcpPacketBuilder';

function makeOptions(overrides: Partial<TcpPacketOptions> = {}): TcpPacketOptions {
  return {
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    srcPort: 12345,
    dstPort: 80,
    seq: 1000,
    ack: 0,
    ...overrides,
  };
}

function tcpPayload(packet: InFlightPacket): TcpSegment {
  const payload = packet.frame.payload.payload;
  if (!('seq' in payload)) {
    throw new Error('Expected TCP payload');
  }
  return payload;
}

describe('tcpPacketBuilder', () => {
  describe('buildSynPacket', () => {
    it('sets syn=true, all other flags false', () => {
      const packet = buildSynPacket(makeOptions());

      expect(tcpPayload(packet).flags).toEqual({
        syn: true,
        ack: false,
        fin: false,
        rst: false,
        psh: false,
        urg: false,
      });
    });

    it('sets protocol=6 (TCP) in IP header', () => {
      const packet = buildSynPacket(makeOptions());

      expect(packet.frame.payload.protocol).toBe(6);
    });

    it('sets correct seq and ack=0', () => {
      const packet = buildSynPacket(makeOptions({ seq: 3210, ack: 99 }));

      expect(tcpPayload(packet).seq).toBe(3210);
      expect(tcpPayload(packet).ack).toBe(0);
    });

    it('sets srcPort and dstPort correctly', () => {
      const packet = buildSynPacket(makeOptions({ srcPort: 49152, dstPort: 443 }));

      expect(tcpPayload(packet).srcPort).toBe(49152);
      expect(tcpPayload(packet).dstPort).toBe(443);
    });

    it('sets default TTL to 64', () => {
      const packet = buildSynPacket(makeOptions());

      expect(packet.frame.payload.ttl).toBe(64);
    });

    it('wraps in proper EthernetFrame -> IpPacket -> TcpSegment structure', () => {
      const packet = buildSynPacket(makeOptions());

      expect(packet.frame.layer).toBe('L2');
      expect(packet.frame.payload.layer).toBe('L3');
      expect(tcpPayload(packet).layer).toBe('L4');
      expect(tcpPayload(packet).payload).toEqual({ layer: 'raw', data: '' });
      expect(packet.currentDeviceId).toBe('client-1');
      expect(packet.path).toEqual([]);
    });
  });

  describe('buildSynAckPacket', () => {
    it('sets syn=true, ack=true, other flags false', () => {
      const packet = buildSynAckPacket(makeOptions({ seq: 5000, ack: 1001 }));

      expect(tcpPayload(packet).flags).toEqual({
        syn: true,
        ack: true,
        fin: false,
        rst: false,
        psh: false,
        urg: false,
      });
    });

    it('sets seq to server ISN', () => {
      const packet = buildSynAckPacket(makeOptions({ seq: 5000, ack: 1001 }));

      expect(tcpPayload(packet).seq).toBe(5000);
    });

    it('sets ack to client ISN + 1', () => {
      const packet = buildSynAckPacket(makeOptions({ seq: 5000, ack: 1001 }));

      expect(tcpPayload(packet).ack).toBe(1001);
    });
  });

  describe('buildAckPacket', () => {
    it('sets ack=true, syn=false', () => {
      const packet = buildAckPacket(makeOptions({ seq: 1001, ack: 5001 }));

      expect(tcpPayload(packet).flags).toEqual({
        syn: false,
        ack: true,
        fin: false,
        rst: false,
        psh: false,
        urg: false,
      });
    });

    it('sets correct seq and ack numbers', () => {
      const packet = buildAckPacket(makeOptions({ seq: 1001, ack: 5001 }));

      expect(tcpPayload(packet).seq).toBe(1001);
      expect(tcpPayload(packet).ack).toBe(5001);
    });
  });

  describe('buildFinPacket', () => {
    it('sets fin=true, ack=true', () => {
      const packet = buildFinPacket(makeOptions({ seq: 1001, ack: 5001 }));

      expect(tcpPayload(packet).flags).toEqual({
        syn: false,
        ack: true,
        fin: true,
        rst: false,
        psh: false,
        urg: false,
      });
    });

    it('includes current sequence number', () => {
      const packet = buildFinPacket(makeOptions({ seq: 1001, ack: 5001 }));

      expect(tcpPayload(packet).seq).toBe(1001);
    });
  });

  describe('buildRstPacket', () => {
    it('sets rst=true, other flags false', () => {
      const packet = buildRstPacket(makeOptions({ ack: 5001 }));

      expect(tcpPayload(packet).flags).toEqual({
        syn: false,
        ack: false,
        fin: false,
        rst: true,
        psh: false,
        urg: false,
      });
    });
  });

  describe('generateISN', () => {
    it('returns deterministic value for same inputs', () => {
      expect(generateISN('client-1', 12345)).toBe(generateISN('client-1', 12345));
    });

    it('returns different values for different node IDs', () => {
      expect(generateISN('client-1', 12345)).not.toBe(generateISN('server-1', 12345));
    });

    it('returns value in 32-bit unsigned range', () => {
      const isn = generateISN('client-1', 12345);

      expect(isn).toBeGreaterThanOrEqual(0);
      expect(isn).toBeLessThanOrEqual(0xffffffff);
    });
  });
});
