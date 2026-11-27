/** The bgpgr concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { bgpgr as en } from '../../src/i18n/locales/en/concept/decks/bgpgr';
import { bgpgr as ja } from '../../src/i18n/locales/ja/concept/decks/bgpgr';
import { DECK } from '../../src/learning/concept-check/lessonDecks/bgpgr';
import { scenario, simulate } from './bgpGracefulRestart';

const dead = { gr: true, failure: 'whole-router', backup: true } as const;

describe('TC-2579: bgpgr deck facts', () => {
  it('q1: without GR a control-plane restart loses 60 s, until End-of-RIB', () => {
    const result = simulate(scenario({ gr: false }));
    expect(result.refreshedMs).toBe(60_000);
    expect(result.lossMs).toBe(60_000);
  });

  it('q2: with GR the helper keeps the routes stale until End-of-RIB and loses nothing', () => {
    const result = simulate(scenario({ gr: true }));
    expect(result.keptStale).toBe(true);
    expect(result.deletedMs).toBeNull();
    expect(result.segments[0]).toMatchObject({ route: 'stale', flowing: true, toMs: 60_000 });
    expect(result.lossMs).toBe(0);
  });

  it('q3: a dead R1 with a C-bit-0 BFD is hidden until 0.9 + 120 = 120.9 s', () => {
    expect(simulate(scenario({ ...dead, detection: 'bfd-c0' })).lossMs).toBe(120_900);
  });

  it('q4: a C-bit-1 BFD keeps GR through a restart but drops a dead R1 in 0.9 s', () => {
    expect(simulate(scenario({ gr: true, detection: 'bfd-c1' })).lossMs).toBe(0);
    expect(simulate(scenario({ ...dead, detection: 'bfd-c1' })).lossMs).toBe(900);
    // The wrong options: a longer Restart Time or a shorter hold time still hide it longer.
    expect(
      simulate(scenario({ ...dead, detection: 'bfd-c0', restartTimeMs: 240_000 })).lossMs,
    ).toBe(240_900);
    expect(simulate(scenario({ ...dead, holdTimeMs: 30_000 })).lossMs).toBe(150_000);
  });
});

describe('bgpgr deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.bgpgr.${q}`;
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
