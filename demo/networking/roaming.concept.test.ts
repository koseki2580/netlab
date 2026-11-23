/** The roaming concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { roaming as en } from '../../src/i18n/locales/en/concept/decks/roaming';
import { roaming as ja } from '../../src/i18n/locales/ja/concept/decks/roaming';
import { DECK } from '../../src/learning/concept-check/lessonDecks/roaming';
import {
  CALL_GAP_BUDGET_MS,
  DEFAULT_POLICY,
  callVerdict,
  packetPath,
  roamTime,
  walk,
} from './wifiRoaming';

describe('TC-2317: roaming deck facts', () => {
  it('q1: a −85 dBm threshold roams later and stays on a weaker signal than −70 dBm', () => {
    const normal = walk(DEFAULT_POLICY);
    const sticky = walk({ ...DEFAULT_POLICY, thresholdDbm: -85 });
    expect(DEFAULT_POLICY.thresholdDbm).toBe(-70);
    expect(sticky.roams[0]!.atM).toBeGreaterThan(normal.roams[0]!.atM);
    expect(sticky.weakestDbm).toBeLessThan(normal.weakestDbm);
    expect(sticky.roams.length).toBeLessThanOrEqual(normal.roams.length);
  });

  it('q2: a full 802.1X roam takes 260 ms, over the 150 ms the call hides', () => {
    const full = roamTime('full-8021x', 30);
    expect(full.totalMs).toBe(260);
    expect(CALL_GAP_BUDGET_MS).toBe(150);
    expect(callVerdict(full.totalMs)).toMatchObject({ survives: false, packetsLost: 13 });
  });

  it('q3: an FT roam is two air exchanges, 10 ms, with no EAP step', () => {
    const ft = roamTime('ft');
    expect(ft.totalMs).toBe(10);
    expect(ft.steps.map((step) => step.id)).toEqual(['ft-auth', 'reassoc']);
  });

  it('q4: central switching sends AP1→AP2 frames through the WLC: 6 links instead of 2', () => {
    expect(packetPath('central', 'AP2')).toEqual({
      hops: ['Phone A', 'AP1', 'SW1', 'Core', 'WLC', 'Core', 'SW1', 'AP2', 'Phone B'],
      viaController: true,
      wiredLinks: 6,
    });
    expect(packetPath('local', 'AP2').wiredLinks).toBe(2);
  });
});

describe('roaming deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.roaming.${q}`;
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
