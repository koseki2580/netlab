import { describe, expect, it } from 'vitest';
import { vlanDropWords } from './VlanDemo';

// TC-710: a drop is said in words; the engine's code is never the sentence.
describe('the VLAN lesson says why a packet was dropped (TC-710)', () => {
  it('explains no-egress-in-vlan in both languages', () => {
    const words = vlanDropWords('no-egress-in-vlan');
    expect(words.en).toContain('no port in the packet’s VLAN');
    expect(words.ja).toContain('VLAN');
    expect(words.en).not.toContain('no-egress-in-vlan');
    expect(words.ja).not.toContain('no-egress-in-vlan');
  });

  // TC-1462 (REQ-350): with the trunk down the sender's ARP goes unanswered in its VLAN.
  it('explains arp-no-reply in both languages (TC-1462)', () => {
    const words = vlanDropWords('arp-no-reply');
    expect(words.en).toContain('Nobody in this VLAN answered the ARP, so nothing was sent.');
    expect(words.ja).toContain('この VLAN の中で ARP に答える機器がなく、何も送られませんでした。');
    expect(words.en).not.toContain('arp-no-reply');
    expect(words.ja).not.toContain('arp-no-reply');
  });

  it('still says something readable for a reason it has no words for', () => {
    const words = vlanDropWords('something-else');
    expect(words.en).toMatch(/^The packet was dropped/);
    expect(words.ja).toMatch(/^パケットは落ちました/);
  });
});
