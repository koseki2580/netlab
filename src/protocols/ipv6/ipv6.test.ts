/** IPv6, ICMPv6 and Neighbour Discovery as packs, and the IPv6 byte view (REQ-321 to REQ-324). */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildIcmpv6EchoRequest,
  buildNeighborAdvertisement,
  buildNeighborSolicitation,
  buildRouterAdvertisement,
} from '../../simulation/icmpv6';
import type { EthernetFrame, Icmpv6Message, Ipv6Packet } from '../../types/packets';
import { buildIpv6HeaderBytes, buildIpv6PayloadBytes } from '../../utils/packetLayout';
import { serializePacket } from '../../utils/packetSerializer';
import icmpv6Learn from '../icmpv6/pack-icmpv6';
import { icmpv6Wire } from '../icmpv6/wire';
import ndLearn from '../nd/pack-nd';
import { ndWire } from '../nd/wire';
import { defineProtocol } from '../pack/define';
import { mergeLearn } from '../pack/merge';
import { deriveLayout } from '../pack/wire';
import { protocolPacks } from '../packs';
import ipv6Learn from './pack-ipv6';
import { ipv6ToValues, ipv6Wire } from './wire';

// The IPv6 family is lazy (REQ-322): load it as the worker and the views do.
beforeAll(async () => {
  await Promise.all(['icmpv6', 'nd', 'ipv6'].map((id) => protocolPacks.loadWire(id)));
});

const SRC = '2001:db8::1';
const DST = '2001:db8::2';
const packet = (payload: Icmpv6Message): Ipv6Packet & { payload: Icmpv6Message } => ({
  layer: 'L3',
  srcIp: SRC,
  dstIp: DST,
  ttl: 255,
  hopLimit: 255,
  protocol: 58,
  nextHeader: 58,
  version: 6,
  payload,
});
const frame = (ip: Ipv6Packet): EthernetFrame => ({
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: '33:33:ff:00:00:02',
  etherType: 0x86dd,
  payload: ip,
});
const addr = (n: number) => [0x20, 0x01, 0x0d, 0xb8, ...Array<number>(11).fill(0), n];

/** A receiver's check: the sum over pseudo-header and message, checksum included, is 0xFFFF. */
function onesSum(bytes: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    sum += ((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0);
    sum = (sum & 0xffff) + (sum >>> 16);
  }
  return sum;
}

describe('the packs (TC-1262)', () => {
  it('pass defineProtocol with text in both languages, and claim their numbers', () => {
    for (const [wire, learn] of [
      [ipv6Wire, ipv6Learn],
      [icmpv6Wire, icmpv6Learn],
      [ndWire, ndLearn],
    ] as const) {
      const pack = defineProtocol(mergeLearn(wire, learn));
      for (const field of [...pack.header, ...(pack.sections ?? []).flatMap((s) => s.fields)]) {
        expect(field.meaning.en.trim(), field.key).not.toBe('');
        expect(field.meaning.ja.trim(), field.key).not.toBe('');
      }
    }
    expect(protocolPacks.byIcmpType(6, 135)?.id).toBe('nd');
    expect(protocolPacks.byIcmpType(6, 128)).toBeUndefined();
    expect(protocolPacks.byIpProtocol(58)?.id).toBe('icmpv6');
  });
});

describe('the ICMPv6 checksum (TC-1263)', () => {
  it('is the RFC 4443 §2.3 sum over the pseudo-header and the message', () => {
    const ip = packet(buildIcmpv6EchoRequest({ identifier: 1, sequenceNumber: 1 }));
    const message = buildIpv6PayloadBytes(ip);
    expect(message.slice(0, 2)).toEqual([128, 0]);
    expect(message.slice(4)).toEqual([0, 1, 0, 1]);
    const pseudo = [...addr(1), ...addr(2), 0, 0, 0, message.length, 0, 0, 0, 58];
    expect(onesSum([...pseudo, ...message])).toBe(0xffff);
    expect(message.slice(2, 4)).not.toEqual([0, 0]);
  });
});

describe('the engine’s ND messages through the ND pack (TC-1264)', () => {
  it('writes NS, NA and RA with their options', () => {
    const ns = buildIpv6PayloadBytes(packet(buildNeighborSolicitation(DST, '02:00:00:00:00:01')));
    expect(ns.slice(0, 2)).toEqual([135, 0]);
    expect(ns.slice(4, 8)).toEqual([0, 0, 0, 0]);
    expect(ns.slice(8, 24)).toEqual(addr(2));
    expect(ns.slice(24)).toEqual([1, 1, 2, 0, 0, 0, 0, 1]);

    const na = buildIpv6PayloadBytes(packet(buildNeighborAdvertisement(DST, '02:00:00:00:00:02')));
    expect(na[0]).toBe(136);
    expect(na[4]).toBe(0x60);
    expect(na.slice(24)).toEqual([2, 1, 2, 0, 0, 0, 0, 2]);

    const ra = buildIpv6PayloadBytes(
      packet(
        buildRouterAdvertisement({ prefix: '2001:db8::/64', managed: false, otherConfig: true }),
      ),
    );
    expect(ra[0]).toBe(134);
    expect(ra[5]).toBe(0x40);
    expect(ra.slice(16, 20)).toEqual([3, 4, 64, 0xc0]);
    expect(ra.slice(16 + 16, 16 + 20)).toEqual([0x20, 0x01, 0x0d, 0xb8]);
    for (const message of [ns, na, ra]) expect(message.length % 8).toBe(0);

    // The engine's NdpMessage shape: R/S/O in `flags`, options as a list.
    const ndp = {
      layer: 'L4',
      type: 136,
      code: 0,
      checksum: 0,
      targetAddress: DST,
      flags: { router: true, solicited: true, override: false },
      options: [{ type: 2, linkLayerAddress: '02:00:00:00:00:02' }],
    } as unknown as Icmpv6Message;
    const fromEngine = buildIpv6PayloadBytes(packet(ndp));
    expect(fromEngine[4]).toBe(0xc0);
    expect(fromEngine.slice(24)).toEqual([2, 1, 2, 0, 0, 0, 0, 2]);
  });
});

describe('the IPv6 byte view (TC-1265)', () => {
  it('shows IPv6 then ICMPv6 rows for an echo request, and ND rows for an NS', () => {
    const echo = packet(buildIcmpv6EchoRequest({ identifier: 7, sequenceNumber: 3 }));
    const { bytes, fields } = serializePacket(frame(echo));
    const value = (name: string) => fields.find((f) => f.name === name)?.displayValue;
    expect(value('EtherType')).toBe('0x86DD (IPv6)');
    expect(value('Version')).toBe('6');
    expect(value('Next Header')).toBe('58 (ICMPv6)');
    expect(value('Payload Length')).toBe('8');
    expect(value('Source Address')).toBe(SRC);
    expect(value('Type')).toBe('128 (Echo Request)');
    expect(fields.find((f) => f.name === 'Identifier')).toMatchObject({
      byteOffset: 66,
      displayValue: '7',
    });
    expect(bytes.length).toBe(8 + 14 + 40 + 8 + 4);

    const ns = serializePacket(frame(packet(buildNeighborSolicitation(DST, '02:00:00:00:00:01'))));
    const nsValue = (name: string) => ns.fields.find((f) => f.name === name)?.displayValue;
    expect(nsValue('Type')).toBe('135 (Neighbor Solicitation)');
    expect(nsValue('Target Address')).toBe(DST);
    expect(nsValue('Option Type')).toBe('1 (Source Link-Layer Address)');
    expect(nsValue('Option Data')).toBe('02:00:00:00:00:01');
    expect(nsValue('Payload Length')).toBe('32');
  });
});

describe('the IPv6 header, two ways (TC-1266)', () => {
  it('is written alike by the engine’s builder and the IPv6 pack', () => {
    const ip = packet(buildIcmpv6EchoRequest({ identifier: 1, sequenceNumber: 1 }));
    const payload = buildIpv6PayloadBytes(ip);
    expect(buildIpv6HeaderBytes({ ...ip, trafficClass: 0xb8, flowLabel: 0x12345 })).toEqual(
      deriveLayout(
        ipv6Wire,
        ipv6ToValues({ ...ip, trafficClass: 0xb8, flowLabel: 0x12345 }, payload.length),
      ).bytes,
    );
  });
});
