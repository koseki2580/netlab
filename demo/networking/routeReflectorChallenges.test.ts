/** REQ-449 — the route-reflector lesson's challenges (TC-2648). */
import { describe, expect, it } from 'vitest';
import { fullMeshSessions, twoRrSessions } from './routeReflector';
import {
  routeReflectorChallenges,
  type RouteReflectorChallengeState,
} from './routeReflectorChallenges';

/** The lesson's state when the challenges first appear. */
const INITIAL: RouteReflectorChallengeState = { n: 10, scenario: 'one-rr' };

const challenge = (state: RouteReflectorChallengeState, id: string) =>
  routeReflectorChallenges(state).find((c) => c.id === id)!;

describe('TC-2648: the route-reflector challenges are reached only by settings the model confirms', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(routeReflectorChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('mesh-over-100: 15 routers (105 sessions) is the smallest; 14 and 16 are not', () => {
    const at = (n: number) => challenge({ ...INITIAL, n }, 'mesh-over-100');
    expect(at(15).reached).toBe(true);
    expect(at(14).reached).toBe(false);
    expect(at(16).reached).toBe(false);
    expect(at(15).why.en).toContain(String(fullMeshSessions(15)));
    expect(at(15).why.ja).toContain(String(fullMeshSessions(14)));
  });

  it('two-rr-tenth: 40 routers (77 against 780) is the smallest; 39 and 41 are not', () => {
    const at = (n: number) => challenge({ ...INITIAL, n }, 'two-rr-tenth');
    expect(at(40).reached).toBe(true);
    expect(at(39).reached).toBe(false);
    expect(at(41).reached).toBe(false);
    expect(at(40).why.en).toContain(
      `${twoRrSessions(40)} sessions against ${fullMeshSessions(40)}`,
    );
    expect(at(40).why.ja).toContain(`${twoRrSessions(40)} セッション`);
  });

  it('route-comes-back: two reflectors with separate cluster IDs, not a shared one or none', () => {
    const at = (scenario: RouteReflectorChallengeState['scenario']) =>
      challenge({ ...INITIAL, scenario }, 'route-comes-back');
    expect(at('two-rr-split').reached).toBe(true);
    expect(at('two-rr-same').reached).toBe(false);
    expect(at('plain').reached).toBe(false);
    expect(at('two-rr-split').why.en).toContain('ORIGINATOR_ID 10.0.0.1');
    expect(at('two-rr-split').why.ja).toContain('2 個のコピー');
  });
});
