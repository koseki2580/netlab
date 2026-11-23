/** The `happyeyeballs` concept deck: each right answer is what the Happy Eyeballs lesson model says. */
import { describe, expect, it } from 'vitest';
import { happyeyeballs as en } from '../../src/i18n/locales/en/concept/decks/happyeyeballs';
import { happyeyeballs as ja } from '../../src/i18n/locales/ja/concept/decks/happyeyeballs';
import { DECK } from '../../src/learning/concept-check/lessonDecks/happyeyeballs';
import {
  ATTEMPT_DELAY_MS,
  NAIVE_TIMEOUT_MS,
  embeddedIpv4,
  happyEyeballs,
  oneAtATime,
  synthesize,
} from './happyEyeballs';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2304: happyeyeballs deck: the right answers hold in the lesson model', () => {
  it('q1 (c): silent IPv6 → IPv4, a little over 250 ms in (280 ms)', () => {
    expect(answer('q1')).toBe('c');
    expect(ATTEMPT_DELAY_MS).toBe(250);
    expect(happyEyeballs('v6-broken')).toEqual({ family: 'IPv4', connectedMs: 280 });
  });
  it('q2 (a): slow IPv6 (300 ms) loses to IPv4 started at 250 ms, up at 280 ms', () => {
    expect(answer('q2')).toBe('a');
    expect(happyEyeballs('v6-slow')).toEqual({ family: 'IPv4', connectedMs: 280 });
  });
  it('q3 (b): one address at a time waits out the 21 s IPv6 timeout first', () => {
    expect(answer('q3')).toBe('b');
    expect(NAIVE_TIMEOUT_MS).toBe(21_000);
    expect(oneAtATime('v6-broken')).toEqual({ family: 'IPv4', connectedMs: 21_030 });
  });
  it('q4 (c): DNS64 turns 192.0.2.33 into 64:ff9b::c000:221, and the NAT64 takes it back out', () => {
    expect(answer('q4')).toBe('c');
    expect(synthesize('192.0.2.33')).toBe('64:ff9b::c000:221');
    expect(embeddedIpv4('64:ff9b::c000:221')).toBe('192.0.2.33');
  });
});

describe('happyeyeballs deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.happyeyeballs.${question}.${key}`];
        const wrong = (['a', 'b', 'c'] as const).filter((letter) => letter !== right);
        for (const key of ['prompt', 'why', 'a', 'b', 'c', ...wrong.map((l) => `${l}.why`)])
          expect(text(key), `${question}.${key}`).toBeTruthy();
        const longestWrong = Math.max(...wrong.map((letter) => text(letter)!.length));
        expect(text(right)!.length / longestWrong, question).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer is not always the same letter', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
