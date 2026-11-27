/** REQ-449 — the L4S lesson's challenges, checked by the bottleneck model (TC-2666). */
import { describe, expect, it } from 'vitest';
import { BUFFER, simulate } from './l4s';
import { l4sChallenges, type L4sState } from './l4sChallenges';

const challenge = (state: L4sState, id: string) => {
  const found = l4sChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

const INITIAL: L4sState = { scenario: 'classic-deep', bufferPackets: BUFFER['classic-deep'] };

describe('TC-2666: the L4S challenges are reached by the sender and buffer the model says reach them', () => {
  it('none is reached on the first shown sender, nor on any sender with its own buffer', () => {
    expect(l4sChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
    for (const scenario of ['classic-shallow', 'l4s'] as const) {
      const own = l4sChallenges({ scenario, bufferPackets: BUFFER[scenario] });
      expect(own.map((c) => c.reached)).toEqual([false, false, false]);
    }
  });

  it('classic-full: 120 packets keeps a classic line 99.6 % used; 110 packets gives 98.4 %; 130 is not the smallest', () => {
    const state: L4sState = { scenario: 'classic-deep', bufferPackets: 120 };
    const reached = challenge(state, 'classic-full');
    expect(reached.reached).toBe(true);
    expect(simulate('classic-deep', 120).utilisationPct).toBe(99.6);
    expect(reached.why.en).toContain('99.6 %');
    expect(reached.why.en).toContain('98.4 %');
    expect(reached.why.en).toContain(`${simulate('classic-deep', 120).maxDelayMs} ms`);
    expect(reached.why.ja).toContain('99.6 %');
    expect(challenge({ ...state, bufferPackets: 110 }, 'classic-full').reached).toBe(false);
    expect(challenge({ ...state, bufferPackets: 130 }, 'classic-full').reached).toBe(false);
    expect(challenge({ scenario: 'l4s', bufferPackets: 120 }, 'classic-full').reached).toBe(false);
  });

  it('l4s-lossless: 30 packets drops nothing with a 5.8 ms worst delay; 20 packets overflows; 40 is not the smallest', () => {
    const state: L4sState = { scenario: 'l4s', bufferPackets: 30 };
    const reached = challenge(state, 'l4s-lossless');
    expect(reached.reached).toBe(true);
    expect(simulate('l4s', 30).drops).toBe(0);
    expect(simulate('l4s', 20).drops).toBeGreaterThan(0);
    expect(reached.why.en).toContain('5.8 ms');
    expect(reached.why.ja).toContain('5.8 ms');
    expect(challenge({ ...state, bufferPackets: 20 }, 'l4s-lossless').reached).toBe(false);
    expect(challenge({ ...state, bufferPackets: 40 }, 'l4s-lossless').reached).toBe(false);
    expect(challenge({ scenario: 'classic-deep', bufferPackets: 30 }, 'l4s-lossless').reached).toBe(
      false,
    );
  });

  it('classic-short: 50 packets keeps a classic worst delay at 10 ms with 90.2 % used; 60 packets reaches 12 ms', () => {
    const state: L4sState = { scenario: 'classic-shallow', bufferPackets: 50 };
    const reached = challenge(state, 'classic-short');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('10 ms');
    expect(reached.why.en).toContain('12 ms');
    expect(reached.why.en).toContain('90.2 %');
    expect(reached.why.ja).toContain('90.2 %');
    expect(challenge({ ...state, bufferPackets: 60 }, 'classic-short').reached).toBe(false);
    expect(challenge({ ...state, bufferPackets: 40 }, 'classic-short').reached).toBe(false);
    expect(challenge({ scenario: 'l4s', bufferPackets: 50 }, 'classic-short').reached).toBe(false);
  });
});
