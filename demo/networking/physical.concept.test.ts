/** The `physical` concept deck: each right answer is what the physical-layer lesson model says. */
import { describe, expect, it } from 'vitest';
import { physical as en } from '../../src/i18n/locales/en/concept/decks/physical';
import { physical as ja } from '../../src/i18n/locales/ja/concept/decks/physical';
import { DECK } from '../../src/learning/concept-check/lessonDecks/physical';
import {
  LLDP_CABLES,
  LLDP_DEVICES,
  POE_BUDGET_W,
  POE_CLASSES,
  POE_DEVICES,
  allocatePower,
  errorCounters,
  lldpTable,
  negotiate,
  type PortSetting,
} from './physicalLayer';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];
const SWITCH: PortSetting = { mode: 'fixed', speed: 100, duplex: 'full' };
const PC: PortSetting = { mode: 'auto' };

describe('TC-2312: physical deck: the right answers hold in the lesson model', () => {
  it('q1 (c): fixed 100 full facing auto: the auto side gets 100 half, a mismatch', () => {
    expect(answer('q1')).toBe('c');
    expect(negotiate(SWITCH, PC)).toEqual({
      link: true,
      a: { speed: 100, duplex: 'full' },
      b: { speed: 100, duplex: 'half' },
      mismatch: true,
    });
  });
  it('q2 (a): the full-duplex side counts runts and FCS errors, no collisions', () => {
    expect(answer('q2')).toBe('a');
    const { a: full } = errorCounters(negotiate(SWITCH, PC), 50);
    expect(full.runts).toBeGreaterThan(0);
    expect(full.fcsErrors).toBeGreaterThan(0);
    expect(full.collisions + full.lateCollisions).toBe(0);
  });
  it('q3 (b): by class, reservations fill 370 W and port 24 is denied while about 214 W is drawn', () => {
    expect(answer('q3')).toBe('b');
    const result = allocatePower(POE_DEVICES, POE_BUDGET_W, 'class');
    expect(result.denied).toEqual([24]);
    expect(result.allocatedW).toBe(355.6);
    expect(result.allocatedW + POE_CLASSES[4].pseW).toBeGreaterThan(POE_BUDGET_W);
    expect(result.drawW).toBe(214);
    expect(POE_CLASSES[4].standard).toBe('802.3at');
  });
  it('q4 (c): core-1 learns access-1 and access-2 over LLDP, not the AP behind access-2', () => {
    expect(answer('q4')).toBe('c');
    const names = lldpTable('core-1', LLDP_DEVICES, LLDP_CABLES).map((entry) => entry.systemName);
    expect(names).toEqual(['access-1', 'access-2']);
  });
});

describe('physical deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.physical.${question}.${key}`];
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
