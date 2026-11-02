/** One description (REQ-302): the wire tier serves the hot path, the learn tier the learner. */
import { describe, expect, it } from 'vitest';
import type { EthernetFrame } from '../types/packets';
import { TraceRecorder } from '../simulation/TraceRecorder';
import { serializePacket } from '../utils/packetSerializer';
import { dnsPack } from './pack/fixtures/dns.pack';
import { grePack } from './pack/fixtures/gre.pack';
import { dnsWire } from './dns/wire';
import { greWire } from './gre/wire';
import { deriveLayout } from './pack/wire';
import { createProtocolPackRegistry } from './pack/registry';
import { protocolPacks } from './packs';

const frame: EthernetFrame = {
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
    payload: {
      layer: 'L4',
      srcPort: 49152,
      dstPort: 53,
      payload: {
        layer: 'L7',
        transactionId: 1,
        isResponse: false,
        questions: [{ name: 'a.b', type: 'A' }],
        answers: [],
      },
    },
  },
};

describe('the wire tier alone (TC-1122)', () => {
  it('writes, lists and labels DNS with no learn tier loaded', () => {
    expect(protocolPacks.get('dns')).toBeUndefined();
    const { bytes, fields } = serializePacket(frame);
    expect(Array.from(bytes.slice(50, 62))).toEqual([0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(fields.find((f) => f.name === 'QR')).toMatchObject({ displayValue: '0 (QUERY)' });
    expect(fields.find((f) => f.name === 'QR')?.meaning).toBeUndefined();
    const label = new TraceRecorder().deriveTraceLabel({ frame } as never);
    expect(label).toBe('DNS QUERY');
  });
});

describe('the two tiers are one description (TC-1123)', () => {
  it('merges into packs defineProtocol accepts, with the same bytes', () => {
    for (const [pack, wire] of [
      [dnsPack, dnsWire],
      [grePack, greWire],
    ] as const) {
      expect(pack.id).toBe(wire.id);
      expect(pack.defaultVersion).toBe(wire.defaultVersion);
      for (const field of pack.header) {
        expect(field.meaning.en.trim()).not.toBe('');
        expect(field.meaning.ja.trim()).not.toBe('');
      }
    }
    const header = { c: 0, k: 1, s: 0, ver: 0, protocolType: 0x0800, key: 7 };
    expect(deriveLayout(greWire, header)).toEqual(deriveLayout(grePack, header));
  });
});

describe('the process-wide registry (TC-1124)', () => {
  it('finds wire tiers by id, number and port without loading', () => {
    expect(protocolPacks.wire('dns')).toBe(dnsWire);
    expect(protocolPacks.byIpProtocol(47)?.id).toBe('gre');
    expect(protocolPacks.byPort('udp', 53)?.id).toBe('dns');
    expect(protocolPacks.list().map((p) => p.id)).toEqual(['dns', 'gre']);
  });

  it('holds tiers that claim no number twice', () => {
    const registry = createProtocolPackRegistry();
    expect(() => protocolPacks.list().forEach((wire) => registry.register(wire))).not.toThrow();
  });

  it('runs a wire tier’s loader once', async () => {
    let loads = 0;
    const registry = createProtocolPackRegistry();
    registry.register(dnsWire, async () => {
      loads += 1;
      return dnsPack;
    });
    await Promise.all([registry.load('dns'), registry.load('dns')]);
    await registry.load('dns');
    expect(loads).toBe(1);
    expect(registry.get('dns')).toBe(dnsPack);
  });
});
