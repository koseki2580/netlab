/** REQ-449 — the BGP graceful restart challenges, checked by the restart model (TC-2662). */
import { describe, expect, it } from 'vitest';
import { LESSON_DEFAULTS } from './bgpGracefulRestart';
import { bgpGracefulRestartChallenges, type RestartTuning } from './bgpGracefulRestartChallenges';

const DEFAULTS: RestartTuning = {
  cpRestartMs: LESSON_DEFAULTS.cpRestartMs,
  restartTimeMs: LESSON_DEFAULTS.restartTimeMs,
};

const challenge = (tuning: RestartTuning, id: string) => {
  const found = bgpGracefulRestartChallenges(tuning).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2662: the BGP graceful restart challenges are reached by the timing the model says reaches them', () => {
  it('none is reached in the lesson’s restart (session back at 45 s, Restart Time 120 s)', () => {
    expect(bgpGracefulRestartChallenges(DEFAULTS).map((c) => c.reached)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('longest-safe-restart: back at 120 s loses nothing; at 135 s the stale routes go at 120 s and 30 s is lost', () => {
    const reached = challenge({ ...DEFAULTS, cpRestartMs: 120_000 }, 'longest-safe-restart');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('135 s');
    expect(reached.why.en).toContain('30 s is lost');
    expect(reached.why.ja).toContain('30 秒の断');
    expect(challenge({ ...DEFAULTS, cpRestartMs: 135_000 }, 'longest-safe-restart').reached).toBe(
      false,
    );
    expect(challenge({ ...DEFAULTS, cpRestartMs: 105_000 }, 'longest-safe-restart').reached).toBe(
      false,
    );
    expect(
      challenge({ cpRestartMs: 150_000, restartTimeMs: 150_000 }, 'longest-safe-restart').reached,
    ).toBe(false);
  });

  it('shortest-restart-time: a 180 s restart needs a 180 s Restart Time; 150 s loses 45 s', () => {
    const reached = challenge(
      { cpRestartMs: 180_000, restartTimeMs: 180_000 },
      'shortest-restart-time',
    );
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('195 s');
    expect(reached.why.en).toContain('45 s is lost');
    expect(
      challenge({ cpRestartMs: 180_000, restartTimeMs: 150_000 }, 'shortest-restart-time').reached,
    ).toBe(false);
    expect(
      challenge({ cpRestartMs: 180_000, restartTimeMs: 210_000 }, 'shortest-restart-time').reached,
    ).toBe(false);
    expect(
      challenge({ cpRestartMs: 90_000, restartTimeMs: 90_000 }, 'shortest-restart-time').reached,
    ).toBe(false);
  });

  it('saves-sixty: Restart Time 60 s with the session back at 90 s loses 45 s instead of 105 s', () => {
    const reached = challenge({ cpRestartMs: 90_000, restartTimeMs: 60_000 }, 'saves-sixty');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('105 s');
    expect(reached.why.en).toContain('loses 45 s');
    expect(reached.why.en).toContain('60 s');
    // Back in time: GR loses nothing.
    expect(challenge({ cpRestartMs: 60_000, restartTimeMs: 60_000 }, 'saves-sixty').reached).toBe(
      false,
    );
    // Late, but the Restart Time saves 90 s.
    expect(challenge({ cpRestartMs: 120_000, restartTimeMs: 90_000 }, 'saves-sixty').reached).toBe(
      false,
    );
  });
});
