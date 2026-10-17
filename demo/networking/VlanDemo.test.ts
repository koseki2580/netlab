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

  it('still says something readable for a reason it has no words for', () => {
    const words = vlanDropWords('something-else');
    expect(words.en).toMatch(/^The packet was dropped/);
    expect(words.ja).toMatch(/^パケットは落ちました/);
  });
});
