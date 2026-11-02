/**
 * DNS in RFC 1035 wire format (REQ-140, REQ-141): the bytes the engine, the hex
 * view and the pcap export use, pinned to the DNS protocol pack.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { deriveAnnotatedFields, deriveLayout } from '../protocols/pack/derive';
import { dnsMessageToValues, dnsPack } from '../protocols/pack/fixtures/dns.pack';
import { layerRegistry } from '../registry/LayerRegistry';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { DnsMessage, EthernetFrame } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { computeFcs, computeIpv4Checksum } from './checksum';
import {
  buildDnsMessageBytes,
  buildEthernetFrameBytes,
  buildIpv4HeaderBytes,
} from './packetLayout';
import { serializePacket } from './packetSerializer';
import { serializePcapFrame } from './pcapSerializer';

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const WEB = [3, ...ascii('web'), 7, ...ascii('example'), 3, ...ascii('com'), 0];

const QUERY: DnsMessage = {
  layer: 'L7',
  transactionId: 0x2a01,
  isResponse: false,
  questions: [{ name: 'web.example.com', type: 'A' }],
  answers: [],
};
const RESPONSE: DnsMessage = {
  ...QUERY,
  isResponse: true,
  answers: [{ name: 'web.example.com', type: 'A', ttl: 300, address: '203.0.113.10' }],
};

function inFrame(message: DnsMessage): EthernetFrame {
  return {
    layer: 'L2',
    srcMac: '02:00:00:00:00:01',
    dstMac: '02:00:00:00:00:02',
    etherType: 0x0800,
    payload: {
      layer: 'L3',
      srcIp: '10.0.0.10',
      dstIp: '10.0.0.53',
      ttl: 64,
      protocol: 17,
      payload: { layer: 'L4', srcPort: 49152, dstPort: 53, payload: message },
    },
  };
}

/** Preamble 8 + Ethernet 14 + IPv4 20 + UDP 8. */
const DNS_AT = 50;
const u16 = (bytes: Uint8Array, at: number) => (bytes[at]! << 8) | bytes[at + 1]!;

describe('DNS hex view in RFC 1035 wire format', () => {
  it('TC-1021: writes a query as header, label-encoded name, QTYPE and QCLASS, counted by UDP and IPv4', () => {
    const { bytes } = serializePacket(inFrame(QUERY));
    expect(Array.from(bytes.slice(DNS_AT, -4))).toEqual([
      0x2a,
      0x01,
      0x01,
      0x00,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      ...WEB,
      0,
      1,
      0,
      1,
    ]);
    expect(u16(bytes, 46)).toBe(8 + 33);
    expect(u16(bytes, 24)).toBe(20 + 8 + 33);
  });

  it('TC-1022: writes a response with its answer record', () => {
    const { bytes } = serializePacket(inFrame(RESPONSE));
    const dns = Array.from(bytes.slice(DNS_AT, -4));
    expect(dns.slice(2, 8)).toEqual([0x85, 0x00, 0, 1, 0, 1]);
    expect(dns.slice(33)).toEqual([...WEB, 0, 1, 0, 1, 0, 0, 0x01, 0x2c, 0, 4, 203, 0, 113, 10]);
  });

  it('TC-1023: answers NXDOMAIN when a response has no answer', () => {
    const bytes = buildDnsMessageBytes({ ...QUERY, isResponse: true });
    expect(bytes.slice(2, 8)).toEqual([0x85, 0x03, 0, 1, 0, 0]);
  });

  it('TC-1024: writes exactly the bytes the DNS pack derives', () => {
    const messages: DnsMessage[] = [
      QUERY,
      RESPONSE,
      { ...QUERY, isResponse: true },
      {
        ...RESPONSE,
        answers: [
          { name: 'web.example.com', type: 'A', ttl: 60, address: '192.0.2.1' },
          { name: 'web.example.com.', type: 'A', ttl: 4_000_000_000, address: '192.0.2.2' },
        ],
      },
      {
        ...QUERY,
        transactionId: 0xffff,
        questions: [
          { name: 'a.b', type: 'A' },
          { name: 'c.', type: 'A' },
        ],
      },
    ];
    for (const message of messages) {
      expect(buildDnsMessageBytes(message)).toEqual(
        deriveLayout(dnsPack, dnsMessageToValues(message)).bytes,
      );
    }
  });

  it('TC-1025: lists every field of the message, as the DNS pack derives it', () => {
    const rows = serializePacket(inFrame(RESPONSE)).fields.filter((f) => f.layer === 'L7');
    const pack = deriveAnnotatedFields(dnsPack, dnsMessageToValues(RESPONSE), {
      baseOffset: DNS_AT,
    });
    expect(rows.map((r) => [r.name, r.byteOffset, r.byteLength, r.displayValue])).toEqual(
      pack.map((r) => [r.name, r.byteOffset, r.byteLength, r.displayValue]),
    );
    const value = (name: string) => rows.find((r) => r.name === name)?.displayValue;
    expect(value('ID')).toBe('0x2A01');
    expect(value('QR')).toBe('1 (RESPONSE)');
    expect(value('AA')).toBe('1');
    expect(value('RA')).toBe('0');
    expect(value('RCODE')).toBe('0 (NOERROR)');
    expect(value('RDATA')).toBe('203.0.113.10');
  });
});

describe('DNS wire bytes in the engine (TC-1026)', () => {
  beforeAll(() => {
    layerRegistry.register({
      layerId: 'l2',
      nodeTypes: {},
      forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
    });
  });

  it('checksums, FCS, UDP Length and pcap all cover the wire bytes', async () => {
    const node = (id: string, data: Record<string, unknown>) => ({
      id,
      type: data['role'],
      position: { x: 0, y: 0 },
      data: { label: id, layerId: data['role'] === 'switch' ? 'l2' : 'l7', ...data },
    });
    const topology = {
      nodes: [
        node('client', { role: 'client', ip: '192.168.1.20', dnsServerIp: '192.168.1.53' }),
        node('sw', {
          role: 'switch',
          ports: [0, 1].map((i) => ({
            id: `p${i}`,
            name: `fa0/${i}`,
            macAddress: `00:00:00:10:00:0${i}`,
          })),
        }),
        node('dns', {
          role: 'server',
          ip: '192.168.1.53',
          dnsServer: { zones: [{ name: 'web.example.com', address: '192.168.1.10' }] },
        }),
      ],
      edges: [
        { id: 'e1', source: 'client', target: 'sw', targetHandle: 'p0' },
        { id: 'e2', source: 'sw', target: 'dns', sourceHandle: 'p1' },
      ],
      areas: [],
      routeTables: new Map(),
    } as unknown as NetworkTopology;
    const engine = new SimulationEngine(topology, new HookEngine());
    await expect(engine.simulateDns('client', 'web.example.com')).resolves.toBe('192.168.1.10');

    const dnsFrames = engine
      .getState()
      .traces.flatMap((t) => engine.exportPcapRecords(t.packetId))
      .map((r) => r.frame as EthernetFrame)
      .filter(
        (f) =>
          f.etherType === 0x0800 &&
          'payload' in f.payload.payload &&
          'questions' in (f.payload.payload.payload as object),
      );
    expect(dnsFrames.length).toBeGreaterThan(1);

    for (const frame of dnsFrames) {
      const udp = frame.payload.payload as { payload: DnsMessage };
      const wire = buildDnsMessageBytes(udp.payload);
      const { bytes } = serializePacket(frame);
      expect(u16(bytes, 46)).toBe(8 + wire.length);
      expect(
        computeIpv4Checksum(buildIpv4HeaderBytes(frame.payload, { checksumOverride: 0 })),
      ).toBe(frame.payload.headerChecksum);
      expect(
        computeFcs(
          buildEthernetFrameBytes(
            { ...frame, fcs: 0 },
            { includePreamble: false, includeFcs: false },
          ),
        ),
      ).toBe(frame.fcs);
      expect(Array.from(serializePcapFrame(frame).slice(42))).toEqual(wire);
    }
  });
});
