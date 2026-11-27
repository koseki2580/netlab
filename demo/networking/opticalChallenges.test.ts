/** REQ-449 — the optical lesson's challenges, checked by the budget model (TC-2630). */
import { describe, expect, it } from 'vitest';
import { ASKED_LINK, budget, type Link } from './optical';
import { opticalChallenges } from './opticalChallenges';

const challenge = (link: Link, id: string) => {
  const found = opticalChallenges(link).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2630: the optical challenges are reached by the link the model says reaches them', () => {
  it('none is reached on the asked link', () => {
    expect(opticalChallenges(ASKED_LINK).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('fibre-only: 1550 nm reaches it with 5 dB; a longer 1550 nm link or 1310 nm does not', () => {
    const at1550: Link = { ...ASKED_LINK, fibre: 'smf-1550' };
    const reached = challenge(at1550, 'fibre-only');
    expect(reached.reached).toBe(true);
    expect(budget(at1550).marginDb).toBe(5);
    expect(reached.why.en).toContain('5 dB');
    expect(reached.why.en).toContain('7.5 dB');
    expect(reached.why.ja).toContain('5 dB');
    expect(challenge({ ...at1550, km: 30.1 }, 'fibre-only').reached).toBe(false);
    expect(challenge({ ...at1550, connectors: 3 }, 'fibre-only').reached).toBe(false);
  });

  it('longest-comfortable: 27.1 km keeps 3.01 dB; 27.2 km falls to 2.98 dB; 27 km is not the longest', () => {
    const reached = challenge({ ...ASKED_LINK, km: 27.1 }, 'longest-comfortable');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('3.01 dB');
    expect(reached.why.en).toContain('2.98 dB');
    expect(challenge({ ...ASKED_LINK, km: 27.2 }, 'longest-comfortable').reached).toBe(false);
    expect(challenge({ ...ASKED_LINK, km: 27 }, 'longest-comfortable').reached).toBe(false);
    expect(
      challenge({ ...ASKED_LINK, fibre: 'smf-1550', km: 27.1 }, 'longest-comfortable').reached,
    ).toBe(false);
  });

  it('down-with-light: 500 m of multimode has margin but exceeds the 300 m reach; 300 m comes up', () => {
    const mmf: Link = { fibre: 'mmf-850', km: 0.5, connectors: 2 };
    const reached = challenge(mmf, 'down-with-light');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain(`${budget(mmf).marginDb} dB`);
    expect(reached.why.en).toContain('300 m');
    expect(challenge({ ...mmf, km: 0.3 }, 'down-with-light').reached).toBe(false);
    // Down on loss, not reach: 2 km and 8 connectors.
    expect(challenge({ fibre: 'mmf-850', km: 2, connectors: 8 }, 'down-with-light').reached).toBe(
      false,
    );
    expect(challenge({ ...ASKED_LINK, km: 40 }, 'down-with-light').reached).toBe(false);
  });
});
