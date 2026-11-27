/** REQ-449 — the load-balancer lesson's challenges, checked by the assignment model (TC-2682). */
import { describe, expect, it } from 'vitest';
import { addressHash } from './loadBalancer';
import { loadBalancerChallenges, type LoadBalancerState } from './loadBalancerChallenges';

/** The lesson's initial state: round robin, every server healthy. */
const INITIAL: LoadBalancerState = { algorithm: 'round-robin', up: [true, true, true] };

const challenge = (state: LoadBalancerState, id: string) => {
  const found = loadBalancerChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2682: the load-balancer challenges are reached by the settings the model says reach them', () => {
  it('none is reached in the lesson’s initial state', () => {
    expect(loadBalancerChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false]);
  });

  it('busiest-two: least connections peaks at 2, 1, 1; round robin and source hash at 3; a server out breaks the limit', () => {
    const reached = challenge({ ...INITIAL, algorithm: 'least-connections' }, 'busiest-two');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('2, 1, 1');
    expect(reached.why.en).toContain('3, 1, 1');
    expect(reached.why.ja).toContain('2、1、1');
    expect(challenge({ ...INITIAL, algorithm: 'source-hash' }, 'busiest-two').reached).toBe(false);
    expect(
      challenge({ algorithm: 'least-connections', up: [true, true, false] }, 'busiest-two').reached,
    ).toBe(false);
  });

  it('hash-reshuffle: with web2 out, 198.51.100.10 moves from healthy web1 to web3; with web1 out nobody healthy moves', () => {
    const state: LoadBalancerState = { algorithm: 'source-hash', up: [true, false, true] };
    const reached = challenge(state, 'hash-reshuffle');
    expect(reached.reached).toBe(true);
    const hash = addressHash('198.51.100.10');
    expect(reached.why.en).toContain('198.51.100.10');
    expect(reached.why.en).toContain(`${hash} mod 3 = ${hash % 3} picks web1`);
    expect(reached.why.en).toContain(`${hash} mod 2 = ${hash % 2} picks web3`);
    expect(reached.why.ja).toContain(`${hash} mod 2`);
    expect(
      challenge({ algorithm: 'source-hash', up: [false, true, true] }, 'hash-reshuffle').reached,
    ).toBe(false);
    expect(
      challenge({ algorithm: 'round-robin', up: [true, false, true] }, 'hash-reshuffle').reached,
    ).toBe(false);
  });
});
