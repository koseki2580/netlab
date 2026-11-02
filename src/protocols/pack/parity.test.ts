/**
 * Parity between the pack derivers and today's hand-written code.
 * Where today's output disagrees with the RFC, the RFC wins and the gap is
 * recorded in docs/core/protocol-packs.md ("Discrepancies found in today's code").
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseGreHeader, serializeGreHeader } from '../../layers/l3-network/tunneling/GreHeader';
import { TraceRecorder } from '../../simulation/TraceRecorder';
import type { DnsMessage, EthernetFrame, InFlightPacket } from '../../types/packets';
import type { GreHeader } from '../../types/tunneling';
import { serializePacket } from '../../utils/packetSerializer';
import { deriveAnnotatedFields, deriveLayout, deriveTraceLabel } from './derive';
import { dnsMessageToValues, dnsPack } from './fixtures/dns.pack';
import { greHeaderToValues, grePack } from './fixtures/gre.pack';

const GRE_SAMPLES: GreHeader[] = [
  {
    hasChecksum: false,
    hasKey: true,
    hasSequence: true,
    version: 0,
    protocolType: 0x0800,
    key: 81,
    sequence: 7,
  },
  {
    hasChecksum: true,
    hasKey: false,
    hasSequence: false,
    version: 0,
    protocolType: 0x0800,
    checksum: 0xbeef,
  },
  { hasChecksum: false, hasKey: false, hasSequence: false, version: 0, protocolType: 0x86dd },
];

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

function dnsFrame(message: DnsMessage): EthernetFrame {
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

function inFlight(frame: EthernetFrame): InFlightPacket {
  return {
    id: 'p1',
    srcNodeId: 'client',
    dstNodeId: 'dns',
    frame,
    currentDeviceId: 'client',
    ingressPortId: '',
    path: [],
    timestamp: 0,
  };
}

describe('parity with today’s GRE header codec', () => {
  it('TC-946: derives the bytes serializeGreHeader writes, and parseGreHeader reads them back', () => {
    for (const header of GRE_SAMPLES) {
      const derived = deriveLayout(grePack, greHeaderToValues(header));
      expect(derived.bytes).toEqual(Array.from(serializeGreHeader(header)));

      const parsed = parseGreHeader(Uint8Array.from(derived.bytes));
      expect(parsed.header).toEqual(header);
      expect(parsed.consumed).toBe(derived.bytes.length);
    }
  });
});

describe('parity with today’s DNS hex view and trace', () => {
  it('TC-947: starts DNS where today’s hex view does, in L7, with today’s trace labels', () => {
    const recorder = new TraceRecorder();
    for (const message of [QUERY, RESPONSE]) {
      const frame = dnsFrame(message);
      const today = serializePacket(frame).fields.find((f) => f.layer === 'L7')!;
      const rows = deriveAnnotatedFields(dnsPack, dnsMessageToValues(message), {
        baseOffset: today.byteOffset,
      });
      expect(rows[0]).toMatchObject({ byteOffset: today.byteOffset, layer: today.layer });
      expect(rows.every((r) => r.layer === 'L7')).toBe(true);
      expect(deriveTraceLabel(dnsPack, dnsMessageToValues(message))).toBe(
        recorder.deriveTraceLabel(inFlight(frame)),
      );
    }
  });

  it('TC-948: writes today’s DNS messages in RFC 1035 wire format, not today’s text', () => {
    const name = [3, ...Array.from('web', (c) => c.charCodeAt(0)), 7];
    const query = deriveLayout(dnsPack, dnsMessageToValues(QUERY)).bytes;
    expect(query.slice(0, 12)).toEqual([0x2a, 0x01, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(query.slice(12, 17)).toEqual(name);
    expect(query.slice(-4)).toEqual([0, 1, 0, 1]);

    const response = deriveLayout(dnsPack, dnsMessageToValues(RESPONSE)).bytes;
    expect(response.slice(0, 8)).toEqual([0x2a, 0x01, 0x85, 0x00, 0, 1, 0, 1]);
    expect(response.slice(-10)).toEqual([0, 0, 0x01, 0x2c, 0, 4, 203, 0, 113, 10]);
  });
});

describe('trial boundary', () => {
  it('TC-949: src/index.ts exports nothing of the pack', () => {
    const index = readFileSync(join(__dirname, '..', '..', 'index.ts'), 'utf8');
    expect(index).not.toMatch(/defineProtocol|ProtocolPack|protocols\/pack|protocols\/packs/);
  });
});
