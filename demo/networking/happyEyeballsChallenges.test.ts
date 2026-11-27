/** REQ-449 — the Happy Eyeballs lesson's challenges, checked by the race model (TC-2670). */
import { describe, expect, it } from 'vitest';
import { ATTEMPT_DELAY_MS, happyEyeballs } from './happyEyeballs';
import { happyEyeballsChallenges } from './happyEyeballsChallenges';

const challenge = (delayMs: number, id: string) => {
  const found = happyEyeballsChallenges(delayMs).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2670: the Happy Eyeballs challenges are reached by the delay the model says reaches them', () => {
  it('none is reached at the recommended 250 ms', () => {
    expect(happyEyeballsChallenges(ATTEMPT_DELAY_MS).map((c) => c.reached)).toEqual([false, false]);
  });

  it('keep-slow-v6: at 270 ms the 300 ms IPv6 path wins the tie with IPv4; at 260 ms IPv4 wins at 290 ms; 280 ms is not the shortest', () => {
    const reached = challenge(270, 'keep-slow-v6');
    expect(reached.reached).toBe(true);
    expect(happyEyeballs('v6-slow', 270)).toEqual({ family: 'IPv6', connectedMs: 300 });
    expect(reached.why.en).toContain('270 + 30 = 300 ms');
    expect(reached.why.en).toContain('290 ms');
    expect(reached.why.ja).toContain('290 ms');
    expect(challenge(260, 'keep-slow-v6').reached).toBe(false);
    expect(challenge(280, 'keep-slow-v6').reached).toBe(false);
  });

  it('quick-past-broken: 70 ms connects past dead IPv6 at 100 ms; 80 ms takes 110 ms; 60 ms is not the longest', () => {
    const reached = challenge(70, 'quick-past-broken');
    expect(reached.reached).toBe(true);
    expect(happyEyeballs('v6-broken', 70).connectedMs).toBe(100);
    expect(reached.why.en).toContain('= 100 ms');
    expect(reached.why.en).toContain('110 ms');
    expect(reached.why.en).toContain('IPv4, 100 ms');
    expect(reached.why.ja).toContain('100 ms');
    expect(challenge(80, 'quick-past-broken').reached).toBe(false);
    expect(challenge(60, 'quick-past-broken').reached).toBe(false);
  });
});
