/** The `mobilecore` concept deck: each right answer is what the 5G user-plane lesson model says. */
import { describe, expect, it } from 'vitest';
import { mobilecore as en } from '../../src/i18n/locales/en/concept/decks/mobilecore';
import { mobilecore as ja } from '../../src/i18n/locales/ja/concept/decks/mobilecore';
import { DECK } from '../../src/learning/concept-check/lessonDecks/mobilecore';
import { SESSION, changed, handover, innerSizes, n3Overhead } from './mobileCore';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2499: mobilecore deck: the right answers hold in the lesson model', () => {
  it('q1 (b): 1500-byte IPv4 N3 with the container leaves an MSS of 1416', () => {
    expect(answer('q1')).toBe('b');
    expect(innerSizes(1500, 'ipv4', true).tcpMss).toBe(1416);
    expect(innerSizes(1500, 'ipv4', false).tcpMss).toBe(1424);
  });
  it('q2 (c): a handover from gNB1 to gNB2 changes only the downlink tunnel end', () => {
    expect(answer('q2')).toBe('c');
    expect(changed(SESSION, handover(SESSION, 'gnb2'))).toEqual(['downlink']);
  });
  it('q3 (a): the UE keeps its IP and its anchor UPF across the handover', () => {
    expect(answer('q3')).toBe('a');
    const after = handover(SESSION, 'gnb2');
    expect(after.ueIp).toBe(SESSION.ueIp);
    expect(after.anchor).toBe(SESSION.anchor);
  });
  it('q4 (b): IPv6 transport costs 20 bytes more: 64 instead of 44', () => {
    expect(answer('q4')).toBe('b');
    expect(n3Overhead('ipv6', true).total - n3Overhead('ipv4', true).total).toBe(20);
    expect(n3Overhead('ipv6', true).total).toBe(64);
  });
});

describe('mobilecore deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, right] of DECK.answers) {
        const base = `learning.concept.mobilecore.${q}`;
        const length = catalog[`${base}.${right}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== right)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(length / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
