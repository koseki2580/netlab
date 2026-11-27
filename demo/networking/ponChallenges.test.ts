/** REQ-449 — the PON lesson's challenges, checked by the optical budget model (TC-2656). */
import { describe, expect, it } from 'vitest';
import { ASKED_STATE, ponChallenges, type PonChallengeState } from './ponChallenges';

const withPlant = (plant: Partial<PonChallengeState['plant']>, classId = ASKED_STATE.classId) => ({
  plant: { ...ASKED_STATE.plant, ...plant },
  classId,
});

const challenge = (state: PonChallengeState, id: string) => {
  const found = ponChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2656: the PON challenges are reached by the plant the budget model says reaches them', () => {
  it('none is reached on the asked plant', () => {
    expect(ponChallenges(ASKED_STATE).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('split-64: 1:64 over 20 km with 2 connectors totals 29 dB in N1; 3 connectors or class N2 do not count', () => {
    const reaching = withPlant({ split: 64, connectors: 2 });
    const reached = challenge(reaching, 'split-64');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('29.00 dB');
    expect(reached.why.en).toContain('29.50 dB');
    expect(reached.why.ja).toContain('29.00 dB');
    expect(challenge(withPlant({ split: 64, connectors: 3 }), 'split-64').reached).toBe(false);
    expect(challenge(withPlant({ split: 64, connectors: 4 }, 'N2'), 'split-64').reached).toBe(
      false,
    );
    expect(challenge(withPlant({ split: 64, km: 10 }), 'split-64').reached).toBe(false);
  });

  it('longest-n1: 27 km totals 28.95 dB; 28 km is over at 29.30 dB; 26 km is not the longest', () => {
    const reached = challenge(withPlant({ km: 27 }), 'longest-n1');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('28.95 dB');
    expect(reached.why.en).toContain('29.30 dB');
    expect(challenge(withPlant({ km: 28 }), 'longest-n1').reached).toBe(false);
    expect(challenge(withPlant({ km: 26 }), 'longest-n1').reached).toBe(false);
    expect(challenge(withPlant({ km: 27 }, 'N2'), 'longest-n1').reached).toBe(false);
  });

  it('too-strong: 1:8, 0 km, 2 connectors lose 11.5 dB, under N1’s 14 dB; 1:16 at 20 km is within it', () => {
    const reaching = withPlant({ split: 8, km: 0, connectors: 2 });
    const reached = challenge(reaching, 'too-strong');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('11.50 dB');
    expect(reached.why.en).toContain('14 dB');
    expect(challenge(withPlant({ split: 16, km: 20, connectors: 2 }), 'too-strong').reached).toBe(
      false,
    );
    // The same plant is under a higher class's minimum: 1:8, 20 km, 4 connectors in E2.
    const e2 = challenge(withPlant({ split: 8 }, 'E2'), 'too-strong');
    expect(e2.reached).toBe(true);
    expect(e2.why.en).toContain('19.50 dB');
    expect(e2.why.en).toContain('20 dB');
  });

  it('a remembered challenge keeps its explanation after the controls move on', () => {
    expect(challenge(ASKED_STATE, 'too-strong').why.en).toContain('11.50 dB');
  });
});
