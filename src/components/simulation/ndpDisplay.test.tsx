import { describe, expect, it } from 'vitest';
import { createTranslator } from '../../i18n/createTranslator';
import { en } from '../../i18n/locales/en';
import { ja } from '../../i18n/locales/ja';
import type { PacketHop } from '../../types/simulation';
import { bubbleForHop } from '../engine/packetStory';
import { parseTraceFilter } from './traceFilter/parser';
import { withNdpWords } from './ndpWords';
import { eventWord } from './traceWords';

const ndpFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:0a',
  dstMac: '33:33:ff:00:00:20',
  etherType: 0x86dd,
  payload: {
    layer: 'L3',
    version: 6,
    srcIp: '2001:db8::10',
    dstIp: 'ff02::1:ff00:20',
    ttl: 255,
    hopLimit: 255,
    nextHeader: 58,
    protocol: 58,
    payload: {
      layer: 'L4',
      type: 135,
      code: 0,
      checksum: 0,
      targetAddress: '2001:db8::20',
      options: [{ type: 1, linkLayerAddress: '02:00:00:00:00:0a' }],
    },
  },
} as NonNullable<PacketHop['ndpFrame']>;

const solicit: PacketHop = {
  step: 1,
  nodeId: 'a',
  nodeLabel: 'A',
  srcIp: '2001:db8::10',
  dstIp: 'ff02::1:ff00:20',
  ttl: 255,
  protocol: 'ICMPv6',
  event: 'ndp-solicit',
  timestamp: 0,
  ndpFrame,
  ndpState: 'INCOMPLETE',
};

const matches = (filter: string, hop: PacketHop) => {
  const parsed = parseTraceFilter(filter);
  if (!parsed.ok) throw new Error(filter);
  return parsed.predicate(hop);
};

// TC-1195: NDP rows are named for what they are, never ARP.
describe('TC-1195: an NDP row in the views and the trace filter', () => {
  it('is NDP to the filter, not ARP', () => {
    expect(matches('protocol == ndp', solicit)).toBe(true);
    expect(matches('protocol == arp', solicit)).toBe(false);
  });

  it('is named as an NDP solicitation, in both languages', () => {
    expect(eventWord('ndp-solicit', withNdpWords(createTranslator('en', en), 'en'))).toBe(
      'NDP solicitation',
    );
    expect(eventWord('ndp-advert', withNdpWords(createTranslator('ja', ja), 'ja'))).toBe(
      'NDP 通知',
    );
  });

  it('asks on the diagram for the target address', () => {
    expect(bubbleForHop(solicit)).toMatchObject({
      kind: 'arpRequest',
      params: { ip: '2001:db8::20' },
    });
  });
});
