/** The `telemetry` concept-check deck: each right answer checked against the streaming-telemetry lesson's model. */
import { describe, expect, it } from 'vitest';
import { telemetry as en } from '../../src/i18n/locales/en/concept/decks/telemetry';
import { telemetry as ja } from '../../src/i18n/locales/ja/concept/decks/telemetry';
import { DECK } from '../../src/learning/concept-check/lessonDecks/telemetry';
import {
  BURST,
  OUTAGE,
  POLL_S,
  SAMPLE_S,
  peak,
  polledStatus,
  readings,
  statusChanges,
} from './telemetry';

describe('TC-2323: telemetry deck facts', () => {
  it('q1: the five-minute SNMP graph peaks at about 20 %', () => {
    expect(BURST.to - BURST.from).toBe(20);
    const top = peak(readings(POLL_S));
    expect(top).toBeGreaterThan(18);
    expect(top).toBeLessThan(25);
  });

  it('q2: the ten-second stream shows the burst at 100 %, its intervals fitting inside it', () => {
    expect(SAMPLE_S).toBeLessThan(BURST.to - BURST.from);
    expect(peak(readings(SAMPLE_S))).toBe(100);
  });

  it('q3: both polls find the link up; the outage falls between them', () => {
    expect(OUTAGE.to - OUTAGE.from).toBe(30);
    expect(polledStatus()).toEqual([
      { at: 300, status: 'UP' },
      { at: 600, status: 'UP' },
    ]);
  });

  it('q4: ON_CHANGE sends two updates, down at 6:40 and up at 7:10', () => {
    expect(statusChanges()).toEqual([
      { at: 400, status: 'DOWN' },
      { at: 430, status: 'UP' },
    ]);
  });
});

describe('the telemetry deck’s strings', () => {
  const keyOf = (q: string, letter: string) => `learning.concept.telemetry.${q}.${letter}`;

  it('has every key the deck needs in both locales, and no others', () => {
    const want = DECK.answers
      .flatMap(([q, answer]) => [
        `${keyOf(q, 'prompt')}`,
        `${keyOf(q, 'why')}`,
        ...(['a', 'b', 'c'] as const).flatMap((letter) =>
          letter === answer ? [keyOf(q, letter)] : [keyOf(q, letter), `${keyOf(q, letter)}.why`],
        ),
      ])
      .sort();
    expect(Object.keys(en).sort()).toEqual(want);
    expect(Object.keys(ja).sort()).toEqual(want);
  });

  it('the right option is at most 1.6× the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const length = (letter: string) => catalog[keyOf(q, letter)]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const).filter((letter) => letter !== answer).map(length),
        );
        expect(length(answer) / wrong, q).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer is not always in the same slot', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
