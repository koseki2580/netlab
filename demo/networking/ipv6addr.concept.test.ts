/** The ipv6addr concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { ipv6addr as en } from '../../src/i18n/locales/en/concept/decks/ipv6addr';
import { ipv6addr as ja } from '../../src/i18n/locales/ja/concept/decks/ipv6addr';
import { DECK } from '../../src/learning/concept-check/lessonDecks/ipv6addr';
import { DELEGATED, classify, compress, lanPrefix, parseIpv6, subnetCount } from './ipv6Addressing';

describe('TC-2419: ipv6addr deck facts', () => {
  it('q1: the longest zero run is compressed and a lone zero stays 0', () => {
    expect(compress('2001:0db8:0000:0001:0000:0000:0000:0001')).toBe('2001:db8:0:1::1');
    expect(parseIpv6('2001:db8::1::1')).toBeNull();
  });

  it('q2: fd12:… is unique local; fe80::1 is link-local and ff02::1 multicast', () => {
    expect(classify(parseIpv6('fd12:3456:789a:1::1')!)).toBe('ula');
    expect(classify(parseIpv6('fe80::1')!)).toBe('link-local');
    expect(classify(parseIpv6('ff02::1')!)).toBe('multicast');
  });

  it('q3: a /56 holds 256 /64s; 65,536 is a /48', () => {
    expect(subnetCount(56, 64)).toBe(256);
    expect(subnetCount(48, 64)).toBe(65_536);
  });

  it('q4: LAN 11 of 2001:db8:1234:5600::/56 is …:560a::/64; …:5610 is LAN 17', () => {
    expect(DELEGATED).toBe('2001:db8:1234:5600::/56');
    expect(lanPrefix(DELEGATED, 11)).toBe('2001:db8:1234:560a::/64');
    expect(lanPrefix(DELEGATED, 17)).toBe('2001:db8:1234:5610::/64');
  });
});

describe('ipv6addr deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.ipv6addr.${q}`;
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
