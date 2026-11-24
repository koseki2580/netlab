/** The `cgnat` concept deck: each right answer is what the carrier-grade NAT lesson model says. */
import { describe, expect, it } from 'vitest';
import { cgnat as en } from '../../src/i18n/locales/en/concept/decks/cgnat';
import { cgnat as ja } from '../../src/i18n/locales/ja/concept/decks/cgnat';
import { DECK } from '../../src/learning/concept-check/lessonDecks/cgnat';
import { USABLE_PORTS, blocksPerAddress, heavySubscriber, mapPortSet } from './cgnat';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2449: cgnat deck: the right answers hold in the lesson model', () => {
  it('q1 (b): ports 1024–65535 make 63 blocks of 1,024', () => {
    expect(answer('q1')).toBe('b');
    expect(USABLE_PORTS).toBe(64_512);
    expect(blocksPerAddress(1024).blocks).toBe(63);
  });
  it('q2 (a): 1,200 flows on one 1,024-port block: refused from flow 1,025, the other 62 subscribers still served', () => {
    expect(answer('q2')).toBe('a');
    expect(heavySubscriber(1024, 1, 1200)).toMatchObject({
      firstRefusedFlow: 1025,
      refusedFlows: 176,
      subscribersServed: 63,
    });
  });
  it('q3 (c): per-block logging is 1 record for 1,200 flows', () => {
    expect(answer('q3')).toBe('c');
    expect(heavySubscriber(1024, 1, 1200)).toMatchObject({
      blockLogRecords: 1,
      flowLogRecords: 1200,
    });
  });
  it('q4 (c): a 6-bit PSID with a = 6 gives 64 subscribers 1,008 ports each, in 63 runs of 16', () => {
    expect(answer('q4')).toBe('c');
    const set = mapPortSet(6, 5);
    expect(set).toMatchObject({ sharing: 64, portsPerSubscriber: 1008 });
    expect(set.ranges).toHaveLength(63);
    expect(set.ranges.every(({ first, last }) => last - first + 1 === 16 && first >= 1024)).toBe(
      true,
    );
  });
});

describe('cgnat deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.cgnat.${question}.${key}`];
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
