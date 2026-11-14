import { describe, expect, it } from 'vitest';
import type { PacketHop } from '../../types/simulation';
import { bubbleForHop } from '../engine/packetStory';
import { bubbleWords, dropWords } from './lazyDropWords';

const unanswered: PacketHop = {
  step: 2,
  nodeId: 'pc-a',
  nodeLabel: 'PC-A',
  srcIp: '192.168.10.10',
  dstIp: '192.168.20.10',
  ttl: 64,
  protocol: 'ICMP',
  event: 'drop',
  reason: 'arp-no-reply',
  timestamp: 0,
};

// TC-1461: a send whose ARP nobody answered is told in words, in both languages:
// the canvas bubble, and the timeline, the hop details and the editor's history.
describe('TC-1461: an unanswered ARP is said in words (REQ-350)', () => {
  it('the canvas bubble keeps the reason, for its words to be loaded', () => {
    expect(bubbleForHop(unanswered)).toMatchObject({
      kind: 'drop',
      params: { reason: 'arp-no-reply' },
    });
  });

  it('in English', () => {
    expect(bubbleWords('arp-no-reply', 'en')).toBe(
      'Stopped here: nobody in its VLAN answered the ARP, so nothing was sent',
    );
    expect(dropWords('arp-no-reply', 'en')).toBe(
      'nobody in its VLAN answered the ARP, so nothing was sent',
    );
  });

  it('in Japanese', () => {
    expect(bubbleWords('arp-no-reply', 'ja')).toBe(
      'ここで止まりました：同じ VLAN の中で ARP に答える機器がなく、何も送られませんでした',
    );
    expect(dropWords('arp-no-reply', 'ja')).toBe(
      '同じ VLAN の中で ARP に答える機器がなく、何も送られませんでした',
    );
  });

  it('leaves the other reasons to the views as before', () => {
    expect(dropWords('no-route', 'ja')).toBeNull();
    expect(dropWords(undefined, 'en')).toBeNull();
  });
});

// TC-1477 (REQ-353): a tunnel end or a label router that would not take the packet, in words.
describe('TC-1477: a VNI that differs and a label with no entry are said in words', () => {
  const at = (reason: string): PacketHop => ({ ...unanswered, nodeId: 'r3', reason });
  it('the canvas bubble keeps each reason, for its words to be loaded', () => {
    for (const reason of ['vxlan-vni-mismatch', 'mpls-no-label']) {
      expect(bubbleForHop(at(reason))).toMatchObject({ kind: 'drop', params: { reason } });
    }
  });

  it('in English and Japanese', () => {
    expect(dropWords('vxlan-vni-mismatch', 'en')).toBe(
      'the far end of the VXLAN tunnel has another VNI, so it did not take it',
    );
    expect(dropWords('vxlan-vni-mismatch', 'ja')).toBe(
      'VXLAN トンネルの向こう端は VNI がちがうので、受け取りませんでした',
    );
    expect(bubbleWords('mpls-no-label', 'en')).toBe(
      'Stopped here: this router has no entry for the label on top, so it threw it away',
    );
    expect(bubbleWords('mpls-no-label', 'ja')).toBe(
      'ここで止まりました：このルータには上のラベルの登録がないので、捨てました',
    );
  });
});
