/** REQ-449 — the telemetry lesson's challenges, checked by the counter model (TC-2678). */
import { describe, expect, it } from 'vitest';
import { SAMPLE_S, peak, readings } from './telemetry';
import { telemetryChallenges } from './telemetryChallenges';

const challenge = (sampleS: number, id: string) => {
  const found = telemetryChallenges(sampleS).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2678: the telemetry challenges are reached by the SAMPLE interval the model says reaches them', () => {
  it('none is reached at the lesson’s 10-second interval', () => {
    expect(telemetryChallenges(SAMPLE_S).map((c) => c.reached)).toEqual([false, false]);
  });

  it('burst-over-half: 30 s shows 71.7 %; 60 s dilutes it to 43.3 %; 20 s is not the longest', () => {
    const reached = challenge(30, 'burst-over-half');
    expect(reached.reached).toBe(true);
    expect(peak(readings(30))).toBe(71.7);
    expect(reached.why.en).toContain('71.7 %');
    expect(reached.why.en).toContain('43.3 %');
    expect(reached.why.ja).toContain('71.7 %');
    expect(challenge(60, 'burst-over-half').reached).toBe(false);
    expect(challenge(20, 'burst-over-half').reached).toBe(false);
  });

  it('outage-at-zero: 20 s still reads 0 %; at 30 s the lowest reading is 5 %', () => {
    const reached = challenge(20, 'outage-at-zero');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('6:40–7:00');
    expect(reached.why.en).toContain('5 %');
    expect(reached.why.ja).toContain('5 %');
    expect(challenge(30, 'outage-at-zero').reached).toBe(false);
    expect(challenge(5, 'outage-at-zero').reached).toBe(false);
  });
});
