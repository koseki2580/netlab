import { describe, expect, it } from 'vitest';
import type { ArpEthernetFrame, EthernetFrame } from '../types/packets';
import type { PacketHop } from '../types/simulation';
import { buildEthernetFrameBytes } from './packetLayout';
import { serializeArpFrame } from './packetSerializer';
import { buildPcap } from './pcapSerializer';

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

const ipv4Frame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0x12345678,
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

const arpFrame: ArpEthernetFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: 'ff:ff:ff:ff:ff:ff',
  etherType: 0x0806,
  fcs: 0x90abcdef,
  payload: {
    layer: 'ARP',
    hardwareType: 1,
    protocolType: 0x0800,
    operation: 'request',
    senderMac: '02:00:00:00:00:01',
    senderIp: '10.0.0.2',
    targetMac: '00:00:00:00:00:00',
    targetIp: '10.0.0.1',
  },
};

function makeHop(step: number, timestamp: number, overrides: Partial<PacketHop> = {}): PacketHop {
  return {
    step,
    nodeId: 'node-1',
    nodeLabel: 'Node 1',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'TCP',
    event: 'create',
    timestamp,
    ...overrides,
  };
}

describe('buildPcap', () => {
  it('returns a valid 24-byte global header for an empty record list', () => {
    const bytes = buildPcap([]);

    expect(bytes.length).toBe(24);
    expect(readUint32LE(bytes, 0)).toBe(0xa1b2c3d4);
    expect(readUint16LE(bytes, 4)).toBe(2);
    expect(readUint16LE(bytes, 6)).toBe(4);
    expect(readUint32LE(bytes, 20)).toBe(1);
  });

  it('serializes an IPv4 frame record with normalized microsecond timestamps', () => {
    const hop = makeHop(5, 1_712_345_678_999);
    const expectedFrameBytes = Uint8Array.from(
      buildEthernetFrameBytes(ipv4Frame, { includePreamble: false, includeFcs: false }),
    );
    const bytes = buildPcap([{ hop, frame: ipv4Frame }]);

    expect(readUint32LE(bytes, 24)).toBe(1_712_345_679);
    expect(readUint32LE(bytes, 28)).toBe(4_000);
    expect(readUint32LE(bytes, 32)).toBe(expectedFrameBytes.length);
    expect(readUint32LE(bytes, 36)).toBe(expectedFrameBytes.length);
    expect(Array.from(bytes.slice(40))).toEqual(Array.from(expectedFrameBytes));
  });

  it('serializes ARP records without the trailing FCS bytes', () => {
    const hop = makeHop(1, 1_712_345_678_123, {
      protocol: 'ARP',
      event: 'arp-request',
    });
    const serializedArp = serializeArpFrame(arpFrame).bytes;
    const expectedFrameBytes = serializedArp.slice(0, serializedArp.length - 4);
    const bytes = buildPcap([{ hop, frame: arpFrame }]);

    expect(readUint32LE(bytes, 32)).toBe(expectedFrameBytes.length);
    expect(Array.from(bytes.slice(40))).toEqual(Array.from(expectedFrameBytes));
  });

  it('packs multiple records back-to-back with no padding', () => {
    const firstFrameBytes = Uint8Array.from(
      buildEthernetFrameBytes(ipv4Frame, { includePreamble: false, includeFcs: false }),
    );
    const secondSerializedArp = serializeArpFrame(arpFrame).bytes;
    const secondFrameBytes = secondSerializedArp.slice(0, secondSerializedArp.length - 4);
    const bytes = buildPcap([
      { hop: makeHop(0, 1_712_345_678_100), frame: ipv4Frame },
      {
        hop: makeHop(2, 1_712_345_678_100, {
          protocol: 'ARP',
          event: 'arp-reply',
        }),
        frame: arpFrame,
      },
    ]);

    const secondRecordOffset = 24 + 16 + firstFrameBytes.length;
    expect(readUint32LE(bytes, secondRecordOffset + 8)).toBe(secondFrameBytes.length);
    expect(Array.from(bytes.slice(secondRecordOffset + 16))).toEqual(Array.from(secondFrameBytes));
  });
});
