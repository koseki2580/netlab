import { describe, expect, it } from 'vitest';
import type { PacketHop } from '../../types/simulation';
import { bubbleForHop } from '../engine/packetStory';
import { bubbleWords, dropWords } from './arpWords';

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
  it('the canvas marks it as its own bubble', () => {
    expect(bubbleForHop(unanswered)?.key).toBe('simulation.packetStory.dropArpNoReply');
  });

  it('in English', () => {
    expect(bubbleWords('en')).toBe(
      'Stopped here: nobody in its VLAN answered the ARP, so nothing was sent',
    );
    expect(dropWords('arp-no-reply', 'en')).toBe(
      'nobody in its VLAN answered the ARP, so nothing was sent',
    );
  });

  it('in Japanese', () => {
    expect(bubbleWords('ja')).toBe(
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
