import { describe, it, expect } from 'vitest';
import { serializePacket } from './packetSerializer';
import type { EthernetFrame } from '../types/packets';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const tcpSynFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 6,
    payload: {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 0,
      ack: 0,
      flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
      payload: { layer: 'raw', data: 'hello' },
    },
  },
};

const tcpSynAckFrame: EthernetFrame = {
  ...tcpSynFrame,
  payload: {
    ...tcpSynFrame.payload,
    payload: {
      ...(tcpSynFrame.payload.payload as object),
      flags: { syn: true, ack: true, fin: false, rst: false, psh: false, urg: false },
      payload: { layer: 'raw', data: '' },
    } as EthernetFrame['payload']['payload'],
  },
};

const udpFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.20',
    ttl: 64,
    protocol: 17,
    payload: {
      layer: 'L4',
      srcPort: 5000,
      dstPort: 53,
      payload: { layer: 'raw', data: 'hi' },
    },
  },
};

const httpFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.20',
    ttl: 64,
    protocol: 6,
    payload: {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 0,
      ack: 0,
      flags: { syn: false, ack: false, fin: false, rst: false, psh: true, urg: false },
      payload: {
        layer: 'L7',
        method: 'GET',
        url: '/',
        headers: {},
      },
    },
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('serializePacket', () => {
  it('1. dstMac is encoded in bytes 0–5', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(0, 6))).toEqual([0, 0, 0, 0, 0, 2]);
  });

  it('2. srcMac is encoded in bytes 6–11', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(6, 12))).toEqual([0, 0, 0, 0, 0, 1]);
  });

  it('3. etherType 0x0800 encoded big-endian at bytes 12–13', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[12]).toBe(0x08);
    expect(bytes[13]).toBe(0x00);
  });

  it('4. IPv4 version+IHL byte is 0x45 at byte 14', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[14]).toBe(0x45);
  });

  it('5. TTL is at byte 22', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[22]).toBe(64);
  });

  it('6. IP protocol byte at byte 23 is 6 for TCP', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[23]).toBe(6);
  });

  it('7. srcIp encoded at bytes 26–29', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(26, 30))).toEqual([10, 0, 0, 10]);
  });

  it('8. dstIp encoded at bytes 30–33', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(30, 34))).toEqual([203, 0, 113, 10]);
  });

  it('9. TCP srcPort 12345 big-endian at bytes 34–35', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    // 12345 = 0x3039
    expect(bytes[34]).toBe(0x30);
    expect(bytes[35]).toBe(0x39);
  });

  it('10. TCP flags byte is 0x02 for SYN-only', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[47]).toBe(0x02);
  });

  it('11. TCP flags byte is 0x12 for SYN+ACK', () => {
    const { bytes } = serializePacket(tcpSynAckFrame);
    expect(bytes[47]).toBe(0x12);
  });

  it('12. annotations[0..13] are all L2', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations.slice(0, 14).every((a) => a === 'L2')).toBe(true);
  });

  it('13. annotations[14..33] are all L3', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations.slice(14, 34).every((a) => a === 'L3')).toBe(true);
  });

  it('14. annotations[34..53] are all L4', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations.slice(34, 54).every((a) => a === 'L4')).toBe(true);
  });

  it('15. annotations[54] is raw for RawPayload', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations[54]).toBe('raw');
  });

  it('16. total byte count is 14 + 20 + 20 + 5 for "hello" payload', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes.length).toBe(14 + 20 + 20 + 5);
  });

  it('17. every byte index is covered by exactly one field (no gaps, no overlaps)', () => {
    const { bytes, fields } = serializePacket(tcpSynFrame);
    const coverage = new Array<number>(bytes.length).fill(0);
    for (const field of fields) {
      for (let i = 0; i < field.byteLength; i++) {
        coverage[field.byteOffset + i]++;
      }
    }
    expect(coverage.every((c) => c === 1)).toBe(true);
  });

  it('18. UDP annotations[34..41] are all L4', () => {
    const { annotations } = serializePacket(udpFrame);
    expect(annotations.slice(34, 42).every((a) => a === 'L4')).toBe(true);
  });

  it('19. UDP length field encodes 8 + payload.length', () => {
    // payload = "hi" = 2 bytes → length = 10
    const { bytes } = serializePacket(udpFrame);
    const length = (bytes[38] << 8) | bytes[39];
    expect(length).toBe(10);
  });

  it('20. HttpMessage payload bytes start with "GET / HTTP/1.1"', () => {
    const { bytes, fields } = serializePacket(httpFrame);
    // L7 payload starts after L2(14) + L3(20) + L4(20) = byte 54
    const l7Field = fields.find((f) => f.layer === 'L7');
    expect(l7Field).toBeDefined();
    const payloadBytes = bytes.slice(l7Field!.byteOffset, l7Field!.byteOffset + 14);
    const text = new TextDecoder().decode(payloadBytes);
    expect(text).toBe('GET / HTTP/1.1');
  });
});
