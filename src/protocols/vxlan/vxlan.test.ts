/** VXLAN as a pack, and GRE/VXLAN rows that wait for their packs (REQ-330, REQ-332). */
import { describe, expect, it } from 'vitest';
import { encapGre } from '../../layers/l3-network/tunneling/GreEncap';
import { decapVxlan, encapVxlan } from '../../layers/l3-network/tunneling/VxlanEncap';
import type { EthernetFrame, IpPacket } from '../../types/packets';
import { serializePacket } from '../../utils/packetSerializer';
import { defineProtocol } from '../pack/define';
import { mergeLearn } from '../pack/merge';
import { deriveLayout } from '../pack/wire';
import { protocolPacks } from '../packs';
import learn from './pack-vxlan';
import { vxlanToValues, vxlanWire } from './wire';

const inner: EthernetFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:01:01',
  dstMac: '02:00:00:00:02:01',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.10.0.10',
    dstIp: '10.20.0.10',
    ttl: 63,
    protocol: 1,
    payload: { layer: 'L4', type: 8, code: 0, checksum: 0, identifier: 1, sequenceNumber: 1 },
  },
};
const outerFrame = (ip: IpPacket): EthernetFrame => ({
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: '02:00:00:00:00:02',
  etherType: 0x0800,
  payload: ip,
});
const CONFIG = { vni: 10000, sourceVtepIp: '192.0.2.1', destinationVtepIp: '192.0.2.2' };

describe('the VXLAN pack (TC-1290)', () => {
  it('passes defineProtocol with text in both languages and writes RFC 7348 bytes', () => {
    const pack = defineProtocol(mergeLearn(vxlanWire, learn));
    for (const field of pack.header) {
      expect(field.meaning.en.trim()).not.toBe('');
      expect(field.meaning.ja.trim()).not.toBe('');
    }
    expect(deriveLayout(pack, vxlanToValues(10000)).bytes).toEqual([8, 0, 0, 0, 0, 0x27, 0x10, 0]);
  });
});

describe('VXLAN on the wire (TC-1291)', () => {
  it('carries the header and the inner frame as bytes, and gives the frame back', () => {
    const outer = encapVxlan(inner, CONFIG);
    const udp = outer.payload as { dstPort: number; payload: { data: string } };
    expect(udp.dstPort).toBe(4789);
    const bytes = Array.from(udp.payload.data, (c) => c.charCodeAt(0));
    expect(bytes.slice(0, 8)).toEqual([8, 0, 0, 0, 0, 0x27, 0x10, 0]);
    expect(bytes.slice(8, 14)).toEqual([2, 0, 0, 0, 2, 1]);
    expect(bytes.slice(20, 22)).toEqual([8, 0]);
    expect(decapVxlan(outer).inner).toEqual(inner);
  });
});

describe('rows that wait for their pack (TC-1295)', () => {
  it('shows one header row before the pack loads, and the pack rows after, over the same bytes', async () => {
    const gre = outerFrame(
      encapGre(inner.payload as IpPacket, {
        sourceIp: '198.51.100.1',
        destinationIp: '198.51.100.2',
        key: 7,
      }),
    );
    const vxlan = outerFrame(encapVxlan(inner, CONFIG));
    const before = [serializePacket(gre), serializePacket(vxlan)];
    expect(before[0]!.fields.find((f) => f.name === 'GRE Header')).toMatchObject({
      byteOffset: 42,
      byteLength: 8,
    });
    expect(before[1]!.fields.find((f) => f.name === 'VXLAN Header')).toMatchObject({
      byteOffset: 50,
      byteLength: 8,
    });
    await Promise.all([protocolPacks.loadWire('gre'), protocolPacks.loadWire('vxlan')]);
    const after = [serializePacket(gre), serializePacket(vxlan)];
    expect(after[0]!.fields.find((f) => f.name === 'Key')?.displayValue).toBe('7');
    expect(after[1]!.fields.find((f) => f.name === 'VNI')).toMatchObject({
      byteOffset: 54,
      displayValue: '10000',
    });
    expect(after[1]!.fields.find((f) => f.name === 'Inner Src IP')?.displayValue).toBe(
      '10.10.0.10',
    );
    expect(after[1]!.fields.find((f) => f.name === 'Inner Dst MAC')?.displayValue).toBe(
      '02:00:00:00:02:01',
    );
    expect(after.map((s) => Array.from(s.bytes))).toEqual(before.map((s) => Array.from(s.bytes)));
    expect(after[1]!.fields.some((f) => f.displayValue.includes('{'))).toBe(false);
  });
});
