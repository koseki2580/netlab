import { describe, expect, it } from 'vitest';
import {
  buildAckPacket,
  buildFinPacket,
  buildRstPacket,
  buildSynAckPacket,
  buildSynPacket,
} from '../layers/l4-transport/tcpPacketBuilder';
import { buildDiscover, handleOffer } from '../services/DhcpClient';
import { LeaseAllocator, handleDiscover, handleRequest } from '../services/DhcpServer';
import { buildDnsQuery } from '../services/DnsClient';
import { handleDnsQuery } from '../services/DnsServer';
import type { IpPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { buildIpv4PacketBytes, buildTransportBytes } from '../utils/packetLayout';
import { getRequired } from '../utils/typedAccess';
import {
  deriveIdentification,
  effectiveMtu,
  fragment,
  needsFragmentation,
  packetSizeBytes,
  tryReassemble,
  type ReassemblyBufferEntry,
} from './fragmentation';
import { makePacket } from './__fixtures__/helpers';

function makeTcpPacket(totalLength = 60, overrides: Partial<IpPacket> = {}): IpPacket {
  const payloadBytes = Math.max(totalLength - 40, 0);

  return {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 6,
    flags: { df: false, mf: false },
    payload: {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 1000,
      ack: 0,
      flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
      payload: {
        layer: 'raw',
        data: 'x'.repeat(payloadBytes),
      },
    },
    ...overrides,
  };
}

function makeIcmpPacket(dataLength = 4, overrides: Partial<IpPacket> = {}): IpPacket {
  return {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 1,
    flags: { df: false, mf: false },
    payload: {
      layer: 'L4',
      type: 8,
      code: 0,
      checksum: 0,
      identifier: 7,
      sequenceNumber: 9,
      data: 'p'.repeat(dataLength),
    },
    ...overrides,
  };
}

function makeServiceTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '192.168.1.10',
          mac: '02:00:00:00:00:10',
          dhcpClient: { enabled: true },
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 0, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '192.168.1.1',
          mac: '02:00:00:00:00:20',
          dhcpServer: {
            leasePool: '192.168.1.0/24',
            subnetMask: '255.255.255.0',
            defaultGateway: '192.168.1.1',
            dnsServer: '192.168.1.1',
            leaseTime: 3600,
          },
          dnsServer: {
            zones: [{ name: 'web.example.com', address: '203.0.113.10' }],
          },
        },
      },
    ],
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

function makeReassemblyEntry(fragments: IpPacket[]): ReassemblyBufferEntry {
  const terminalFragment = fragments.find((candidate) => candidate.flags?.mf !== true) ?? null;
  const firstFragment =
    fragments.find((candidate) => (candidate.fragmentOffset ?? 0) === 0) ??
    getRequired(fragments, 0, { reason: 'expected first fragment' });

  return {
    key: '10.0.0.10|203.0.113.10|1234|6',
    firstFragment,
    fragments: new Map(fragments.map((candidate) => [candidate.fragmentOffset ?? 0, candidate])),
    totalBytesExpected:
      terminalFragment == null
        ? null
        : (terminalFragment.fragmentOffset ?? 0) * 8 + (packetSizeBytes(terminalFragment) - 20),
  };
}

function fixturePackets(): IpPacket[] {
  const topology = makeServiceTopology();
  const discover = buildDiscover('client-1', topology)!;
  const allocator = new LeaseAllocator(
    getRequired(topology.nodes, 1, { reason: 'expected dhcp server fixture node' }).data
      .dhcpServer!,
  );
  const offer = handleDiscover(discover, topology, allocator)!;
  const request = handleOffer(offer, 'client-1', topology);
  const ack = handleRequest(request, topology, allocator)!;
  const dnsQuery = buildDnsQuery('client-1', 'web.example.com', topology, new Map())!;
  const dnsResponse = handleDnsQuery(dnsQuery, topology)!;

  return [
    makePacket('fixture-basic', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10').frame.payload,
    buildSynPacket({
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcPort: 49152,
      dstPort: 80,
      seq: 1000,
      ack: 0,
    }).frame.payload,
    buildSynAckPacket({
      srcNodeId: 'server-1',
      dstNodeId: 'client-1',
      srcIp: '203.0.113.10',
      dstIp: '10.0.0.10',
      srcPort: 80,
      dstPort: 49152,
      seq: 2000,
      ack: 1001,
    }).frame.payload,
    buildAckPacket({
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcPort: 49152,
      dstPort: 80,
      seq: 1001,
      ack: 2001,
    }).frame.payload,
    buildFinPacket({
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcPort: 49152,
      dstPort: 80,
      seq: 1002,
      ack: 2001,
    }).frame.payload,
    buildRstPacket({
      srcNodeId: 'server-1',
      dstNodeId: 'client-1',
      srcIp: '203.0.113.10',
      dstIp: '10.0.0.10',
      srcPort: 80,
      dstPort: 49152,
      seq: 2001,
      ack: 1002,
    }).frame.payload,
    makeIcmpPacket(16),
    discover.frame.payload,
    offer.frame.payload,
    request.frame.payload,
    ack.frame.payload,
    dnsQuery.frame.payload,
    dnsResponse.frame.payload,
  ];
}

describe('fragmentation', () => {
  describe('packetSizeBytes', () => {
    it('sums IP header + TCP header + payload bytes', () => {
      expect(packetSizeBytes(makeTcpPacket(60))).toBe(60);
    });

    it('respects explicit totalLength when provided', () => {
      expect(packetSizeBytes(makeTcpPacket(60, { totalLength: 900 }))).toBe(900);
    });
  });

  describe('effectiveMtu', () => {
    it('returns Infinity when both inputs are undefined', () => {
      expect(effectiveMtu(undefined, undefined)).toBe(Infinity);
    });

    it('returns linkMtu when only linkMtu is set', () => {
      expect(effectiveMtu(1400, undefined)).toBe(1400);
    });

    it('returns interfaceMtu when only interfaceMtu is set', () => {
      expect(effectiveMtu(undefined, 1300)).toBe(1300);
    });

    it('returns the smaller value when both inputs are set', () => {
      expect(effectiveMtu(1500, 1400)).toBe(1400);
      expect(effectiveMtu(1200, 1400)).toBe(1200);
    });
  });

  describe('needsFragmentation', () => {
    it('false when mtu is Infinity', () => {
      expect(needsFragmentation(makeTcpPacket(1500), Infinity)).toBe(false);
    });

    it('false when packet size equals mtu', () => {
      expect(needsFragmentation(makeTcpPacket(1500), 1500)).toBe(false);
    });

    it('true when packet size exceeds mtu', () => {
      expect(needsFragmentation(makeTcpPacket(1501), 1500)).toBe(true);
    });

    it('false for representative built-in fixture packets when mtu is Infinity', () => {
      for (const packet of fixturePackets()) {
        expect(needsFragmentation(packet, Infinity)).toBe(false);
      }
    });
  });

  describe('fragment', () => {
    it('returns the packet unchanged when size is within mtu', () => {
      const packet = makeTcpPacket(500);

      expect(fragment(packet, 1500, 1234)).toEqual([packet]);
    });

    it('splits a 1500-byte packet into two fragments at mtu=1000', () => {
      const fragments = fragment(makeTcpPacket(1500), 1000, 1234);

      expect(fragments).toHaveLength(2);
      expect(fragments.map((candidate) => packetSizeBytes(candidate))).toEqual([996, 524]);
    });

    it('splits a 4000-byte packet into three fragments at mtu=1500', () => {
      const fragments = fragment(makeTcpPacket(4000), 1500, 1234);

      expect(fragments).toHaveLength(3);
      expect(fragments.map((candidate) => packetSizeBytes(candidate))).toEqual([1500, 1500, 1040]);
    });

    it('sets identical identification on every fragment', () => {
      const fragments = fragment(makeTcpPacket(4000), 1500, 4321);

      expect(new Set(fragments.map((candidate) => candidate.identification))).toEqual(
        new Set([4321]),
      );
    });

    it('sets fragmentOffset in 8-byte units starting at 0', () => {
      const fragments = fragment(makeTcpPacket(4000), 1500, 1234);

      expect(fragments.map((candidate) => candidate.fragmentOffset)).toEqual([0, 185, 370]);
    });

    it('sets flags.mf=true on all but the last fragment', () => {
      const fragments = fragment(makeTcpPacket(4000), 1500, 1234);

      expect(fragments.map((candidate) => candidate.flags?.mf)).toEqual([true, true, false]);
    });

    it('preserves flags.df on every fragment', () => {
      const fragments = fragment(
        makeTcpPacket(1500, { flags: { df: true, mf: false } }),
        1000,
        9999,
      );

      expect(fragments.every((candidate) => candidate.flags?.df === true)).toBe(true);
    });

    it('throws when mtu is smaller than the minimum IPv4 fragment size', () => {
      expect(() => fragment(makeTcpPacket(1500), 27, 1234)).toThrow(/mtu/i);
    });

    it('keeps a structured transport payload only on the first fragment when the header fits', () => {
      const fragments = fragment(makeTcpPacket(1500), 1000, 1234);

      expect(fragments[0]?.payload.layer).toBe('L4');
      expect(fragments[1]?.payload.layer).toBe('raw');
    });

    it('is byte-complete when the outputs are reassembled', () => {
      const original = makeTcpPacket(4000);
      const fragments = fragment(original, 1500, 1234);
      const reassembled = tryReassemble(makeReassemblyEntry(fragments));

      expect(reassembled).not.toBeNull();
      expect(buildTransportBytes(reassembled!.payload)).toEqual(
        buildTransportBytes(original.payload),
      );
      expect(buildIpv4PacketBytes(reassembled!)).toEqual(
        buildIpv4PacketBytes({
          ...original,
          identification: 1234,
          flags: { df: false, mf: false },
          fragmentOffset: 0,
          totalLength: packetSizeBytes(original),
        }),
      );
    });
  });

  describe('deriveIdentification', () => {
    it('is deterministic for the same inputs', () => {
      expect(deriveIdentification('10.0.0.10', '203.0.113.10', 'session-1', 1)).toBe(
        deriveIdentification('10.0.0.10', '203.0.113.10', 'session-1', 1),
      );
    });

    it('differs for different sequence numbers', () => {
      expect(deriveIdentification('10.0.0.10', '203.0.113.10', 'session-1', 1)).not.toBe(
        deriveIdentification('10.0.0.10', '203.0.113.10', 'session-1', 2),
      );
    });

    it('fits in 16 bits', () => {
      const identification = deriveIdentification('10.0.0.10', '203.0.113.10', 'session-1', 1);

      expect(identification).toBeGreaterThanOrEqual(0);
      expect(identification).toBeLessThanOrEqual(0xffff);
    });
  });

  describe('tryReassemble', () => {
    it('returns null while mf=1 fragments are pending', () => {
      const fragments = fragment(makeTcpPacket(4000), 1500, 1234);
      const partialEntry = makeReassemblyEntry(fragments.slice(0, 2));

      expect(tryReassemble(partialEntry)).toBeNull();
    });

    it('returns null when only mf=0 arrived without lower fragments', () => {
      const fragments = fragment(makeTcpPacket(4000), 1500, 1234);
      const last = getRequired(fragments, 2, { reason: 'expected terminal fragment' });
      const entry = makeReassemblyEntry([last]);

      expect(tryReassemble(entry)).toBeNull();
    });

    it('returns the reconstituted packet once all fragments are present', () => {
      const original = makeTcpPacket(4000);
      const fragments = fragment(original, 1500, 1234);

      expect(tryReassemble(makeReassemblyEntry(fragments))).toEqual({
        ...original,
        identification: 1234,
        flags: { df: false, mf: false },
        fragmentOffset: 0,
        totalLength: 4000,
      });
    });

    it('restores the original L4 payload on the reconstituted packet', () => {
      const original = makeIcmpPacket(64);
      const fragments = fragment(original, 40, 777);
      const reassembled = tryReassemble(makeReassemblyEntry(fragments));

      expect(reassembled?.payload).toEqual(original.payload);
    });

    it('sets flags.mf=false and fragmentOffset=0 on the reconstituted packet', () => {
      const fragments = fragment(
        makeTcpPacket(4000, { flags: { df: true, mf: false } }),
        1500,
        1234,
      );
      const reassembled = tryReassemble(makeReassemblyEntry(fragments));

      expect(reassembled?.flags).toEqual({ df: true, mf: false });
      expect(reassembled?.fragmentOffset).toBe(0);
    });
  });
});
