/** NTP, added by following "Add a protocol" (REQ-314). */
import { describe, expect, it } from 'vitest';
import { parseTraceFilter } from '../../components/simulation/traceFilter/parser';
import type { PacketHop } from '../../types/simulation';
import { defineProtocol } from '../pack/define';
import { mergeLearn } from '../pack/merge';
import { deriveAnnotatedFields, deriveLayout, deriveTraceLabel } from '../pack/wire';
import { protocolPacks } from '../packs';
import ntpLearn from './pack-ntp';
import { ntpWire } from './wire';

const ntpPack = defineProtocol(mergeLearn(ntpWire, ntpLearn));

/** RFC 5905 §7.3: a client's request, as an SNTP client (RFC 4330 §5) sends it. */
const REQUEST = {
  li: 0,
  vn: 4,
  mode: 3,
  stratum: 0,
  poll: 6,
  precision: 0xec, // −20
  rootDelay: 0,
  rootDispersion: 0,
  referenceId: [0, 0, 0, 0],
  referenceSeconds: 0,
  referenceFraction: 0,
  originSeconds: 0,
  originFraction: 0,
  receiveSeconds: 0,
  receiveFraction: 0,
  transmitSeconds: 0xeb1d_0c80,
  transmitFraction: 0x8000_0000,
};

describe('NTP (TC-1165)', () => {
  it('writes a client request in RFC 5905 format and labels it', () => {
    const { bytes, fields } = deriveLayout(ntpPack, REQUEST);
    expect(bytes).toHaveLength(48);
    expect(bytes.slice(0, 4)).toEqual([0x23, 0, 6, 0xec]);
    expect(bytes.slice(40)).toEqual([0xeb, 0x1d, 0x0c, 0x80, 0x80, 0, 0, 0]);
    expect(fields.find((f) => f.key === 'transmitSeconds')?.byteOffset).toBe(40);
    const rows = deriveAnnotatedFields(ntpPack, REQUEST);
    expect(rows.find((r) => r.key === 'precision')?.displayValue).toBe('-20');
    expect(rows.find((r) => r.key === 'mode')?.displayValue).toBe('3 (CLIENT)');
    expect(deriveTraceLabel(ntpPack, REQUEST)).toBe('NTP CLIENT');
    expect(deriveTraceLabel(ntpPack, { ...REQUEST, mode: 4 })).toBe('NTP SERVER');
  });
});

describe('NTP as a pack (TC-1166)', () => {
  it('has text for every field in both languages, and the filter knows it', () => {
    for (const field of ntpPack.header) {
      expect(field.meaning.en.trim()).not.toBe('');
      expect(field.meaning.ja.trim()).not.toBe('');
    }
    expect(protocolPacks.byPort('udp', 123)?.id).toBe('ntp');
    const hop = {
      step: 0,
      nodeId: 'c',
      nodeLabel: 'c',
      srcIp: '10.0.0.1',
      dstIp: '10.0.0.2',
      ttl: 64,
      protocol: 'UDP',
      srcPort: 50000,
      dstPort: 123,
      event: 'forward',
      timestamp: 0,
    } as PacketHop;
    const filter = parseTraceFilter('protocol == ntp');
    if (!filter.ok) throw filter.error;
    expect(filter.predicate(hop)).toBe(true);
  });
});
