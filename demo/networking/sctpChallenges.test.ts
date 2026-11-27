/** REQ-449 — the SCTP lesson's challenges, checked by the failover model (TC-2660). */
import { describe, expect, it } from 'vitest';
import { RFC_DEFAULTS } from './sctp';
import { sctpChallenges, type SctpTuning } from './sctpChallenges';

const DEFAULTS: SctpTuning = {
  pathMaxRetrans: RFC_DEFAULTS.pathMaxRetrans,
  rtoMinMs: RFC_DEFAULTS.rtoMinMs,
};

const challenge = (tuning: SctpTuning, id: string) => {
  const found = sctpChallenges(tuning).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2660: the SCTP challenges are reached by the tuning the failover model says reaches them', () => {
  it('none is reached with the RFC defaults (63 s)', () => {
    expect(sctpChallenges(DEFAULTS).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('rto-min-only: RTO.Min 100 ms fails over in 6.3 s; 200 ms takes 12.6 s; lowering Path.Max.Retrans does not count', () => {
    const reached = challenge({ ...DEFAULTS, rtoMinMs: 100 }, 'rto-min-only');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('6.3 s');
    expect(reached.why.en).toContain('12.6 s');
    expect(reached.why.ja).toContain('6.3 秒');
    expect(challenge({ ...DEFAULTS, rtoMinMs: 200 }, 'rto-min-only').reached).toBe(false);
    expect(challenge({ pathMaxRetrans: 1, rtoMinMs: 1000 }, 'rto-min-only').reached).toBe(false);
  });

  it('most-patient: Path.Max.Retrans 2 fails over in 7 s; 3 takes 15 s; 1 is not the largest', () => {
    const reached = challenge({ ...DEFAULTS, pathMaxRetrans: 2 }, 'most-patient');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('7 s');
    expect(reached.why.en).toContain('15 s');
    expect(challenge({ ...DEFAULTS, pathMaxRetrans: 3 }, 'most-patient').reached).toBe(false);
    expect(challenge({ ...DEFAULTS, pathMaxRetrans: 1 }, 'most-patient').reached).toBe(false);
    expect(challenge({ pathMaxRetrans: 2, rtoMinMs: 500 }, 'most-patient').reached).toBe(false);
  });

  it('sub-second: RTO.Min 100 ms with Path.Max.Retrans 2 takes 700 ms; 3 takes 1500 ms; 1 is too few', () => {
    const reached = challenge({ pathMaxRetrans: 2, rtoMinMs: 100 }, 'sub-second');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('700 ms');
    expect(reached.why.en).toContain('1500 ms');
    expect(challenge({ pathMaxRetrans: 3, rtoMinMs: 100 }, 'sub-second').reached).toBe(false);
    expect(challenge({ pathMaxRetrans: 2, rtoMinMs: 200 }, 'sub-second').reached).toBe(false);
    // 600 ms, but only one error allowed.
    expect(challenge({ pathMaxRetrans: 1, rtoMinMs: 200 }, 'sub-second').reached).toBe(false);
  });
});
