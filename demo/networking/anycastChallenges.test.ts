/** REQ-449 — the anycast lesson's challenges, checked by the BGP and DNS models (TC-2680). */
import { describe, expect, it } from 'vitest';
import { anycastChallenges, type AnycastState } from './anycastChallenges';

/** The lesson's state after the reveal: every site up, the public London resolver. */
const INITIAL: AnycastState = { down: null, resolver: 'public-london' };

const challenge = (state: AnycastState, id: string) => {
  const found = anycastChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2680: the anycast challenges are reached by the settings the models say reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(anycastChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false]);
  });

  it('singapore-near: withdrawing Frankfurt gives 74 ms instead of 162 ms; Tokyo or New York does not', () => {
    const reached = challenge({ ...INITIAL, down: 'site-fra' }, 'singapore-near');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('162 ms');
    expect(reached.why.en).toContain('74 ms');
    expect(reached.why.ja).toContain('74 ms');
    expect(challenge({ ...INITIAL, down: 'site-tyo' }, 'singapore-near').reached).toBe(false);
    expect(challenge({ ...INITIAL, down: 'site-nyc' }, 'singapore-near').reached).toBe(false);
  });

  it('osaka-through-london: ECS sends Osaka to Tokyo in 12 ms; without ECS 252 ms; its own resolver breaks the limit', () => {
    const reached = challenge(
      { ...INITIAL, resolver: 'public-london-ecs' },
      'osaka-through-london',
    );
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('198.51.100.10');
    expect(reached.why.en).toContain('12 ms');
    expect(reached.why.en).toContain('252 ms');
    expect(reached.why.ja).toContain('12 ms');
    expect(challenge({ ...INITIAL, resolver: 'own' }, 'osaka-through-london').reached).toBe(false);
  });
});
