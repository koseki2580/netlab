/** The `dhcplease` concept deck: each right answer is what the DHCP lease lesson model says. */
import { describe, expect, it } from 'vitest';
import { dhcplease as en } from '../../src/i18n/locales/en/concept/decks/dhcplease';
import { dhcplease as ja } from '../../src/i18n/locales/ja/concept/decks/dhcplease';
import { DECK } from '../../src/learning/concept-check/lessonDecks/dhcplease';
import { leaseTimes, simulateLease } from './dhcpLease';

const H = 3600;
const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2429: dhcplease deck: the right answers hold in the lesson model', () => {
  it('q1 (b): an 8 h lease, server dead at 1 h: the first unanswered request is the renew at 4 h', () => {
    expect(answer('q1')).toBe('b');
    const outcome = simulateLease({ leaseS: 8 * H, serverDownS: 1 * H, serverB: false });
    expect(outcome.firstUnansweredS).toBe(4 * H);
    expect(outcome.addressLostS).toBe(8 * H);
  });
  it('q2 (c): a 24 h lease first broadcasts its request at T2, 21 h', () => {
    expect(answer('q2')).toBe('c');
    expect(leaseTimes(24 * H).t2S).toBe(21 * H);
    const outcome = simulateLease({ leaseS: 24 * H, serverDownS: 1 * H, serverB: false });
    expect(outcome.events.find((e) => e.kind === 'rebind')?.atS).toBe(21 * H);
  });
  it('q3 (a): a server dead at 5 h of an 8 h lease renewed it at 4 h, so the address goes at 12 h', () => {
    expect(answer('q3')).toBe('a');
    const outcome = simulateLease({ leaseS: 8 * H, serverDownS: 5 * H, serverB: false });
    expect(outcome.events[1]).toEqual({ atS: 4 * H, kind: 'renew', answeredBy: 'A' });
    expect(outcome.addressLostS).toBe(12 * H);
    expect(outcome.events.find((e) => e.kind === 'rebind')?.atS).toBe(11 * H);
  });
  it('q4 (c): server B never answers a renew; it answers the broadcast rebind at T2 and the address is kept', () => {
    expect(answer('q4')).toBe('c');
    const outcome = simulateLease({ leaseS: 8 * H, serverDownS: 1 * H, serverB: true });
    expect(outcome.events.some((e) => e.kind === 'renew' && e.answeredBy !== null)).toBe(false);
    expect(outcome.events[outcome.events.length - 1]).toEqual({
      atS: 7 * H,
      kind: 'rebind',
      answeredBy: 'B',
    });
    expect(outcome.addressLostS).toBeNull();
  });
});

describe('dhcplease deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.dhcplease.${question}.${key}`];
        const wrong = (['a', 'b', 'c'] as const).filter((letter) => letter !== right);
        for (const key of ['prompt', 'why', 'a', 'b', 'c', ...wrong.map((l) => `${l}.why`)])
          expect(text(key), `${question}.${key}`).toBeTruthy();
        expect(text(`${right}.why`), `${question}: no why on the right option`).toBeUndefined();
        const longestWrong = Math.max(...wrong.map((letter) => text(letter)!.length));
        expect(text(right)!.length / longestWrong, question).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer is not always the same letter', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
