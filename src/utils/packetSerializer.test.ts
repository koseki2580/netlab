import { describe, expect, it } from 'vitest';
import type { ArpEthernetFrame, EthernetFrame } from '../types/packets';
import { serializeArpFrame, serializePacket } from './packetSerializer';

const tcpSynFrame: EthernetFrame = {
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
    identification: 0x1234,
    headerChecksum: 0xabcd,
    payload: {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 0,
      ack: 0,
      flags: {
        syn: true,
        ack: false,
        fin: false,
        rst: false,
        psh: false,
        urg: false,
      },
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
      flags: {
        syn: true,
        ack: true,
        fin: false,
        rst: false,
        psh: false,
        urg: false,
      },
      payload: { layer: 'raw', data: '' },
    } as EthernetFrame['payload']['payload'],
  },
};

const udpFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0x12345678,
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

const dhcpFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: 'ff:ff:ff:ff:ff:ff',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0x12345678,
  payload: {
    layer: 'L3',
    srcIp: '0.0.0.0',
    dstIp: '255.255.255.255',
    ttl: 64,
    protocol: 17,
    payload: {
      layer: 'L4',
      srcPort: 68,
      dstPort: 67,
      payload: {
        layer: 'L7',
        messageType: 'DISCOVER',
        transactionId: 1,
        clientMac: '02:00:00:00:00:01',
        options: {},
      },
    },
  },
};

const dnsFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0x12345678,
  payload: {
    layer: 'L3',
    srcIp: '192.168.1.101',
    dstIp: '192.168.1.53',
    ttl: 64,
    protocol: 17,
    payload: {
      layer: 'L4',
      srcPort: 5000,
      dstPort: 53,
      payload: {
        layer: 'L7',
        transactionId: 1,
        isResponse: false,
        questions: [{ name: 'web.example.com', type: 'A' }],
        answers: [],
      },
    },
  },
};

const httpFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0x12345678,
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
      flags: {
        syn: false,
        ack: false,
        fin: false,
        rst: false,
        psh: true,
        urg: false,
      },
      payload: {
        layer: 'L7',
        httpVersion: 'HTTP/1.1',
        method: 'GET',
        url: '/',
        headers: {},
      },
    },
  },
};

const icmpFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0x12345678,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.20',
    ttl: 64,
    protocol: 1,
    payload: {
      layer: 'L4',
      type: 8,
      code: 0,
      checksum: 0,
      identifier: 0x1234,
      sequenceNumber: 1,
      data: 'ping',
    },
  },
};

const arpRequestFrame: ArpEthernetFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: 'ff:ff:ff:ff:ff:ff',
  etherType: 0x0806,
  fcs: 0x12345678,
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

describe('serializePacket', () => {
  it('serializes the Ethernet preamble and SFD in the first 8 bytes', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(0, 8))).toEqual([0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xab]);
  });

  it('encodes dstMac at bytes 8-13', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(8, 14))).toEqual([0, 0, 0, 0, 0, 2]);
  });

  it('encodes srcMac at bytes 14-19', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(14, 20))).toEqual([0, 0, 0, 0, 0, 1]);
  });

  it('encodes etherType at bytes 20-21', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[20]).toBe(0x08);
    expect(bytes[21]).toBe(0x00);
  });

  it('encodes the IPv4 version and IHL byte at offset 22', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[22]).toBe(0x45);
  });

  it('encodes TTL at byte 30', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[30]).toBe(64);
  });

  it('encodes the IP protocol at byte 31', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[31]).toBe(6);
  });

  it('serializes ICMP payloads without treating them as UDP', () => {
    const { bytes, fields } = serializePacket(icmpFrame);

    expect(bytes[31]).toBe(1);
    expect(fields.find((field) => field.name === 'Protocol')?.displayValue).toBe('1 (ICMP)');
    expect(fields.find((field) => field.name === 'Type')?.displayValue).toBe('8');
    expect(fields.find((field) => field.name === 'Sequence Number')?.displayValue).toBe('1');
  });

  it('encodes srcIp at bytes 34-37', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(34, 38))).toEqual([10, 0, 0, 10]);
  });

  it('encodes dstIp at bytes 38-41', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(38, 42))).toEqual([203, 0, 113, 10]);
  });

  it('encodes the TCP source port at bytes 42-43', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[42]).toBe(0x30);
    expect(bytes[43]).toBe(0x39);
  });

  it('encodes the TCP flags byte for SYN-only packets', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes[55]).toBe(0x02);
  });

  it('encodes the TCP flags byte for SYN+ACK packets', () => {
    const { bytes } = serializePacket(tcpSynAckFrame);
    expect(bytes[55]).toBe(0x12);
  });

  it('marks the preamble, Ethernet header, and FCS bytes as L2', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations.slice(0, 22).every((tag) => tag === 'L2')).toBe(true);
    expect(annotations.slice(-4).every((tag) => tag === 'L2')).toBe(true);
  });

  it('marks the IPv4 header bytes as L3', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations.slice(22, 42).every((tag) => tag === 'L3')).toBe(true);
  });

  it('marks TCP header bytes as L4', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations.slice(42, 62).every((tag) => tag === 'L4')).toBe(true);
  });

  it('marks the raw payload bytes as raw', () => {
    const { annotations } = serializePacket(tcpSynFrame);
    expect(annotations[62]).toBe('raw');
  });

  it('includes preamble and FCS in the serialized byte length', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(bytes.length).toBe(8 + 14 + 20 + 20 + 5 + 4);
  });

  it('covers every byte index with exactly one field entry', () => {
    const { bytes, fields } = serializePacket(tcpSynFrame);
    const coverage = new Array<number>(bytes.length).fill(0);

    for (const field of fields) {
      for (let i = 0; i < field.byteLength; i++) {
        coverage[field.byteOffset + i]++;
      }
    }

    expect(coverage.every((count) => count === 1)).toBe(true);
  });

  it('marks UDP header bytes as L4', () => {
    const { annotations } = serializePacket(udpFrame);
    expect(annotations.slice(42, 50).every((tag) => tag === 'L4')).toBe(true);
  });

  it('encodes the UDP length as header plus payload length', () => {
    const { bytes } = serializePacket(udpFrame);
    const length = (bytes[46] << 8) | bytes[47];
    expect(length).toBe(10);
  });

  it('serializes HTTP payload bytes after the L2/L3/L4 headers', () => {
    const { bytes, fields } = serializePacket(httpFrame);
    const l7Field = fields.find((field) => field.layer === 'L7');

    expect(l7Field).toBeDefined();
    const payloadBytes = bytes.slice(l7Field!.byteOffset, l7Field!.byteOffset + 14);
    expect(new TextDecoder().decode(payloadBytes)).toBe('GET / HTTP/1.1');
  });

  it('labels DHCP payloads as L7 DHCP data', () => {
    const { fields } = serializePacket(dhcpFrame);
    const field = fields.find((candidate) => candidate.name === 'DHCP Payload');

    expect(field).toBeDefined();
    expect(field?.layer).toBe('L7');
    expect(field?.displayValue).toContain('DHCP DISCOVER');
  });

  it('labels DNS payloads as L7 DNS data', () => {
    const { fields } = serializePacket(dnsFrame);
    const field = fields.find((candidate) => candidate.name === 'DNS Payload');

    expect(field).toBeDefined();
    expect(field?.layer).toBe('L7');
    expect(field?.displayValue).toContain('DNS QUERY');
  });

  it('appends the FCS as the final 4 bytes of the frame', () => {
    const { bytes } = serializePacket(tcpSynFrame);
    expect(Array.from(bytes.slice(-4))).toEqual([0x12, 0x34, 0x56, 0x78]);
  });

  it('renders the materialized IPv4 checksum in the field table', () => {
    const { fields } = serializePacket(tcpSynFrame);
    expect(fields.find((field) => field.name === 'Header Checksum')?.displayValue).toBe('0xABCD');
    expect(fields.find((field) => field.name === 'Identification')?.displayValue).toBe('0x1234');
  });
});

describe('serializeArpFrame', () => {
  it('encodes broadcast destination MAC, EtherType, and ARP operation bytes', () => {
    const { bytes } = serializeArpFrame(arpRequestFrame);

    expect(Array.from(bytes.slice(0, 6))).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    expect(Array.from(bytes.slice(12, 14))).toEqual([0x08, 0x06]);
    expect(Array.from(bytes.slice(20, 22))).toEqual([0x00, 0x01]);
  });

  it('encodes the sender and target protocol addresses at the documented offsets', () => {
    const { bytes } = serializeArpFrame(arpRequestFrame);

    expect(Array.from(bytes.slice(28, 32))).toEqual([10, 0, 0, 2]);
    expect(Array.from(bytes.slice(32, 38))).toEqual([0, 0, 0, 0, 0, 0]);
    expect(Array.from(bytes.slice(38, 42))).toEqual([10, 0, 0, 1]);
  });

  it('marks the Ethernet envelope as L2 and the ARP payload bytes as ARP', () => {
    const { bytes, annotations, fields } = serializeArpFrame(arpRequestFrame);
    const coverage = new Array<number>(bytes.length).fill(0);

    expect(bytes.length).toBe(46);
    expect(annotations.slice(0, 14).every((tag) => tag === 'L2')).toBe(true);
    expect(annotations.slice(14, 42).every((tag) => tag === 'ARP')).toBe(true);
    expect(annotations.slice(42).every((tag) => tag === 'L2')).toBe(true);

    for (const field of fields) {
      for (let i = 0; i < field.byteLength; i++) {
        coverage[field.byteOffset + i]++;
      }
    }

    expect(coverage.every((count) => count === 1)).toBe(true);
  });
});
