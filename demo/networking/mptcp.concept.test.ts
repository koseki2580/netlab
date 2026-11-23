/** The mptcp concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { mptcp as en } from '../../src/i18n/locales/en/concept/decks/mptcp';
import { mptcp as ja } from '../../src/i18n/locales/ja/concept/decks/mptcp';
import { DECK } from '../../src/learning/concept-check/lessonDecks/mptcp';
import {
  FILE_MB,
  PATHS,
  WIFI,
  bottleneckShares,
  download,
  failover,
  schedule,
  windowKb,
} from './mptcp';

describe('TC-2310: mptcp deck facts', () => {
  it('q1: 50 MB over both paths takes about 6.7 s; Wi-Fi alone takes 10 s', () => {
    expect(FILE_MB).toBe(50);
    expect(download(PATHS).seconds).toBeCloseTo(6.67, 2);
    expect(download([WIFI]).seconds).toBe(10);
  });

  it('q2: a 64 KB request goes over Wi-Fi alone, whose full window is 100 KB', () => {
    expect(windowKb(WIFI)).toBe(100);
    expect(schedule(64)).toEqual({ wifi: 64, lte: 0 });
  });

  it('q3: with MP_CAPABLE stripped, losing Wi-Fi breaks the download', () => {
    expect(failover('mptcp', 3, false)).toMatchObject({ mode: 'tcp', finished: false });
    expect(failover('mptcp', 3, true)).toMatchObject({ mode: 'mptcp', finished: true });
  });

  it('q4: coupled, two subflows get about half the bottleneck; uncoupled about two thirds', () => {
    expect(bottleneckShares(2, true).mptcpPct).toBe(50);
    expect(bottleneckShares(2, false).mptcpPct).toBe(67);
  });
});

describe('mptcp deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.mptcp.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, `${base}`).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
