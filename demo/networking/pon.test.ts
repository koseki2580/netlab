/** REQ-443 — passive optical networks (TC-2550..TC-2556). */
import { describe, expect, it } from 'vitest';
import { CLASSES, budget, dbaGrants, frameBytes, share, splitterLoss } from './pon';

const cls = (id: string) => CLASSES.find((c) => c.id === id)!;

describe('TC-2550: the line rate is shared by the busy subscribers', () => {
  it('XGS-PON 1:32, all busy: 311.04 Mb/s each way; GPON: 77.76 down, 38.88 up', () => {
    expect(share('xgspon', 32)).toEqual({ downMbps: 311.04, upMbps: 311.04 });
    expect(share('gpon', 32)).toEqual({ downMbps: 77.76, upMbps: 38.88 });
  });
  it('with only 4 busy, each XGS-PON subscriber gets 2488.32 Mb/s', () => {
    expect(share('xgspon', 4).downMbps).toBe(2488.32);
  });
});

describe('TC-2551: each 1:2 stage of the splitter costs about 3.5 dB', () => {
  it('1:32 is 17.5 dB typical (15.05 ideal); 1:64 is 21 dB', () => {
    expect(splitterLoss(32)).toEqual({ typicalDb: 17.5, idealDb: 15.05 });
    expect(splitterLoss(64).typicalDb).toBe(21);
  });
});

describe('TC-2552: a 1:32 split over 20 km fits class N1', () => {
  it('17.5 + 7 + 2 = 26.5 dB, 2.5 dB under N1’s 29 dB', () => {
    expect(budget({ split: 32, km: 20, connectors: 4 }, cls('N1'))).toEqual({
      splitterDb: 17.5,
      fibreDb: 7,
      connectorDb: 2,
      totalDb: 26.5,
      marginDb: 2.5,
      verdict: 'ok',
    });
  });
});

describe('TC-2553: a 1:64 split over 20 km is over N1 but fits N2', () => {
  it('30 dB: 1 dB over N1’s 29, 1 dB under N2’s 31', () => {
    const plant = { split: 64, km: 20, connectors: 4 };
    expect(budget(plant, cls('N1'))).toMatchObject({ totalDb: 30, marginDb: -1, verdict: 'over' });
    expect(budget(plant, cls('N2'))).toMatchObject({ marginDb: 1, verdict: 'ok' });
  });
});

describe('TC-2554: too little loss is also out of class', () => {
  it('1:4 over 1 km loses 8.35 dB, under N1’s 14 dB minimum', () => {
    expect(budget({ split: 4, km: 1, connectors: 2 }, cls('N1'))).toMatchObject({
      totalDb: 8.35,
      verdict: 'under',
    });
  });
});

describe('TC-2555: DBA grants what fits and shares the rest fairly', () => {
  it('demands that fit are granted in full', () => {
    expect(dbaGrants('xgspon', [1000, 2000, 500]).map((g) => g.grantMbps)).toEqual([
      1000, 2000, 500,
    ]);
  });
  it('over capacity: the small demand is met, the rest split equally, never above the line rate', () => {
    const grants = dbaGrants('xgspon', [8000, 500, 4000, 6000]);
    expect(grants.map((g) => g.grantMbps)).toEqual([3151.09, 500, 3151.09, 3151.09]);
    expect(grants.reduce((sum, g) => sum + g.grantMbps, 0)).toBeCloseTo(9953.28, 1);
  });
});

describe('TC-2556: the upstream bursts take turns in each 125 µs frame', () => {
  it('XGS-PON carries 155 520 bytes upstream per frame; the bursts follow one another without overlap', () => {
    expect(frameBytes('xgspon')).toBe(155_520);
    expect(frameBytes('gpon')).toBe(19_440);
    const grants = dbaGrants('xgspon', [8000, 500, 4000, 6000]);
    for (let i = 1; i < grants.length; i++) {
      expect(grants[i]!.startUs).toBe(grants[i - 1]!.endUs);
    }
    expect(grants[0]!.startUs).toBe(0);
    expect(grants[grants.length - 1]!.endUs).toBe(125);
  });
});
