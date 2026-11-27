/** The qinq concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { qinq as en } from '../../src/i18n/locales/en/concept/decks/qinq';
import { qinq as ja } from '../../src/i18n/locales/ja/concept/decks/qinq';
import { DECK } from '../../src/learning/concept-check/lessonDecks/qinq';
import { TAG_BYTES, TPID, frameBytes, journey, maxPayload, vlanSpace } from './qinq';

describe('TC-2549: qinq deck facts', () => {
  it('q1: the S-tag is one more 4-byte tag, so 1522 becomes 1526 bytes and the C-tag stays inside', () => {
    expect(frameBytes(1500, 1)).toBe(1522);
    expect(TAG_BYTES).toBe(4);
    const core = journey('A', 'qinq').hops[1]!;
    expect(core.bytes).toBe(1526);
    expect(core.tags.map((tag) => tag.tpid)).toEqual([TPID.sTag, TPID.cTag]);
  });

  it('q2: a 1522-byte core leaves 1496 bytes of payload under two tags; 1526 is needed for 1500', () => {
    expect(maxPayload(1522, 2)).toBe(1496);
    expect(maxPayload(1526, 2)).toBe(1500);
  });

  it('q3: A’s broadcast in VLAN 10 reaches only A2; without S-tags it would reach B2 too', () => {
    expect(journey('A', 'qinq').deliveredTo).toEqual(['A2']);
    expect(journey('A', 'shared-vlan').deliveredTo).toEqual(['A2', 'B2']);
  });

  it('q4: two tags give 4094 × 4094 = 16 760 836 VLANs, not 4094 or 8188', () => {
    expect(vlanSpace(2)).toBe(16_760_836);
    expect(vlanSpace(2)).toBe(vlanSpace(1) * vlanSpace(1));
  });
});

describe('qinq deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.qinq.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
