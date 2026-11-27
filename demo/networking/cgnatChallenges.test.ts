/** REQ-449 — the carrier-grade NAT lesson's challenges (TC-2636). */
import { describe, expect, it } from 'vitest';
import { cgnatChallenges, type CgnatChallengeState } from './cgnatChallenges';

/** The lesson's settings when its lab first appears. */
const INITIAL: CgnatChallengeState = { blockSize: 1024, maxBlocks: 1, flows: 1200, psidBits: 6 };

const challenge = (state: CgnatChallengeState, id: string) => {
  const found = cgnatChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2636: the CGNAT challenges are reached only by settings the model says reach them', () => {
  it('no challenge is reached in the lesson’s initial settings', () => {
    expect(cgnatChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('many-subscribers: 512-port blocks, up to 3 each, carry 1,200 flows and serve 124', () => {
    const reaching = { ...INITIAL, blockSize: 512, maxBlocks: 3 };
    expect(challenge(reaching, 'many-subscribers').reached).toBe(true);
    expect(challenge(reaching, 'many-subscribers').why.en).toContain('124');
    expect(challenge(reaching, 'many-subscribers').why.ja).toContain('124');
    // Two 1,024-port blocks let every flow through, but serve only 62.
    expect(challenge({ ...INITIAL, maxBlocks: 2 }, 'many-subscribers').reached).toBe(false);
    // Two 512-port blocks serve many, but refuse flows.
    expect(
      challenge({ ...INITIAL, blockSize: 512, maxBlocks: 2 }, 'many-subscribers').reached,
    ).toBe(false);
  });

  it('one-record: one 4,096-port block holds 3,000 flows, logged once, serving 15', () => {
    const reaching = { ...INITIAL, blockSize: 4096, flows: 3000 };
    expect(challenge(reaching, 'one-record').reached).toBe(true);
    expect(challenge(reaching, 'one-record').why.en).toContain('3,000');
    expect(challenge(reaching, 'one-record').why.en).toContain('only 15 subscribers');
    // Two 2,048-port blocks let every flow through, but log two records.
    expect(
      challenge({ ...INITIAL, blockSize: 2048, maxBlocks: 2, flows: 3000 }, 'one-record').reached,
    ).toBe(false);
  });

  it('map-ports: a 5-bit PSID gives 32 subscribers 2,016 ports each', () => {
    expect(challenge({ ...INITIAL, psidBits: 5 }, 'map-ports').reached).toBe(true);
    expect(challenge({ ...INITIAL, psidBits: 5 }, 'map-ports').why.en).toContain('2,016');
    expect(challenge({ ...INITIAL, psidBits: 5 }, 'map-ports').why.ja).toContain('2,016');
    // 4 bits: 4,032 ports each, but only 16 subscribers.
    expect(challenge({ ...INITIAL, psidBits: 4 }, 'map-ports').reached).toBe(false);
  });
});
