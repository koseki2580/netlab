/** REQ-449 — the physical-layer challenges, checked by the duplex model (TC-2672). */
import { describe, expect, it } from 'vitest';
import { errorCounters, negotiate, type PortSetting } from './physicalLayer';
import {
  INITIAL_DUPLEX,
  physicalLayerChallenges,
  type DuplexState,
} from './physicalLayerChallenges';

const fixed = (speed: 10 | 100, duplex: 'full' | 'half'): PortSetting => ({
  mode: 'fixed',
  speed,
  duplex,
});
const AUTO: PortSetting = { mode: 'auto' };

const challenge = (state: DuplexState, id: string) => {
  const found = physicalLayerChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2672: the physical-layer challenges are reached by the port settings the model says reach them', () => {
  it('none is reached in the lesson as it opens', () => {
    expect(physicalLayerChallenges(INITIAL_DUPLEX).map((c) => c.reached)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('pc-only: fixing the PC at 100 full clears the mismatch; 100 half, 10 full or auto do not', () => {
    const state = { ...INITIAL_DUPLEX, b: fixed(100, 'full') };
    const reached = challenge(state, 'pc-only');
    expect(reached.reached).toBe(true);
    const before = errorCounters(negotiate(INITIAL_DUPLEX.a, AUTO), 50);
    expect(reached.why.en).toContain(
      `against ${before.b.lateCollisions} and ${before.a.fcsErrors}`,
    );
    expect(reached.why.en).toContain('0 late collisions');
    expect(reached.why.ja).toContain(String(before.b.lateCollisions));
    expect(challenge({ ...INITIAL_DUPLEX, b: fixed(100, 'half') }, 'pc-only').reached).toBe(false);
    expect(challenge({ ...INITIAL_DUPLEX, b: fixed(10, 'full') }, 'pc-only').reached).toBe(false);
    // Clean, but the switch port was changed too.
    expect(challenge({ a: AUTO, b: AUTO, loadPct: 50 }, 'pc-only').reached).toBe(false);
  });

  it('switch-counts: switch on auto facing a PC fixed full makes the switch the half side', () => {
    const state: DuplexState = { a: AUTO, b: fixed(100, 'full'), loadPct: 50 };
    const reached = challenge(state, 'switch-counts');
    expect(reached.reached).toBe(true);
    const counters = errorCounters(negotiate(state.a, state.b), 50);
    expect(counters.a.lateCollisions).toBe(14368);
    expect(reached.why.en).toContain('14368 late collisions');
    expect(reached.why.en).toContain('100 Mbit/s half duplex');
    expect(reached.why.ja).toContain('14368');
    // No traffic, nothing counted.
    expect(challenge({ ...state, loadPct: 0 }, 'switch-counts').reached).toBe(false);
    // The mismatch the other way round: the PC counts them.
    expect(
      challenge({ ...state, a: fixed(100, 'full'), b: fixed(100, 'half') }, 'switch-counts')
        .reached,
    ).toBe(false);
  });

  it('fixed-meets-auto: a switch fixed at half duplex agrees with what auto falls back to', () => {
    const state = { ...INITIAL_DUPLEX, a: fixed(10, 'half') };
    const reached = challenge(state, 'fixed-meets-auto');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('finds 10 Mbit/s');
    expect(reached.why.en).toContain('0 late collisions');
    expect(
      challenge({ ...INITIAL_DUPLEX, a: fixed(100, 'half') }, 'fixed-meets-auto').reached,
    ).toBe(true);
    expect(challenge({ ...INITIAL_DUPLEX, a: fixed(10, 'full') }, 'fixed-meets-auto').reached).toBe(
      false,
    );
    expect(challenge({ ...INITIAL_DUPLEX, a: AUTO }, 'fixed-meets-auto').reached).toBe(false);
  });
});
