/** The mplste concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { mplste as en } from '../../src/i18n/locales/en/concept/decks/mplste';
import { mplste as ja } from '../../src/i18n/locales/ja/concept/decks/mplste';
import { DECK } from '../../src/learning/concept-check/lessonDecks/mplste';
import { cspfPlacement, fastReroute, igpPlacement, lspRequests } from './mplsTe';

describe('TC-2309: mplste deck facts', () => {
  it('q1: without TE all 15 Gbit/s go over A–B–Z, overloading the 10 Gbit/s A–B while A–C sits idle', () => {
    const igp = igpPlacement(lspRequests());
    expect(igp.path.routers).toEqual(['A', 'B', 'Z']);
    expect(igp.worstLink).toEqual({ id: 'A-B', loadGbps: 15, capacityGbps: 10 });
    expect(igp.loadGbps['A-C']).toBe(0);
    expect(igp.loadGbps['A-E']).toBe(0);
  });

  it('q2: after LSP 1 leaves 4 Gbit/s on A–B, CSPF puts the 5 Gbit/s LSP 2 on A→C→Z', () => {
    const { placements } = cspfPlacement(lspRequests());
    expect(placements[0]!.path!.routers).toEqual(['A', 'B', 'Z']);
    expect(placements[1]!.path!.routers).toEqual(['A', 'C', 'Z']);
  });

  it('q3: when B–Z fails, B is the point of local repair with a bypass B→D→Z for LSPs 1 and 3', () => {
    const frr = fastReroute(lspRequests());
    expect(frr.plr).toBe('B');
    expect(frr.mergePoint).toBe('Z');
    expect(frr.bypass!.routers).toEqual(['B', 'D', 'Z']);
    expect(frr.protectedIds).toEqual(['lsp1', 'lsp3']);
  });

  it('q4: re-placed without B–Z, LSP 1 goes A→E→Z because A–C has only 5 Gbit/s left', () => {
    const { after } = fastReroute(lspRequests());
    expect(after.placements.find((p) => p.id === 'lsp1')!.path!.routers).toEqual(['A', 'E', 'Z']);
    expect(after.placements.find((p) => p.id === 'lsp2')!.path!.routers).toEqual(['A', 'C', 'Z']);
  });
});

describe('mplste deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.mplste.${q}`;
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
