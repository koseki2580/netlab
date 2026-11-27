/** REQ-449 — the lossless data-centre lesson's challenges, checked by the PFC simulation (TC-2632). */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, simulate } from './losslessDc';
import { losslessDcChallenges, type HeadroomSetting } from './losslessDcChallenges';

const INITIAL: HeadroomSetting = {
  cable: DEFAULT_CONFIG.cableMetres,
  headroom: DEFAULT_CONFIG.headroomFrames,
};

const challenge = (setting: HeadroomSetting, id: string) => {
  const found = losslessDcChallenges(setting).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2632: the lossless-DC challenges are reached by the settings the simulation says reach them', () => {
  it('none is reached at 96 m with 10 frames of headroom', () => {
    expect(losslessDcChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('smallest-headroom: 13 frames at 192 m drops nothing, 12 drops 13 frames, 14 is not the smallest', () => {
    const reached = challenge({ cable: 192, headroom: 13 }, 'smallest-headroom');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('with 12 frames, 13 are dropped');
    expect(reached.why.en).toContain('estimate asks for 18');
    expect(reached.why.ja).toContain('13 フレームが捨てられます');
    expect(challenge({ cable: 192, headroom: 12 }, 'smallest-headroom').reached).toBe(false);
    expect(challenge({ cable: 192, headroom: 14 }, 'smallest-headroom').reached).toBe(false);
  });

  it('kindest-to-v: 7 frames at 96 m gives V 187 turns with no drop; 6 drops, 8 gives V fewer', () => {
    const reached = challenge({ cable: 96, headroom: 7 }, 'kindest-to-v');
    expect(reached.reached).toBe(true);
    expect(simulate('pfc', { ...DEFAULT_CONFIG, headroomFrames: 7 }).innocentSent).toBe(187);
    expect(reached.why.en).toContain('V got 187 of its 350 turns');
    expect(reached.why.en).toContain('XOFF at 104 of 160');
    expect(challenge({ cable: 96, headroom: 6 }, 'kindest-to-v').reached).toBe(false);
    expect(challenge({ cable: 96, headroom: 8 }, 'kindest-to-v').reached).toBe(false);
    expect(challenge({ cable: 72, headroom: 7 }, 'kindest-to-v').reached).toBe(false);
  });

  it('longest-cable: 144 m is the longest the 10 frames protect; 168 m drops 30; 120 m is not the longest', () => {
    const reached = challenge({ cable: 144, headroom: 10 }, 'longest-cable');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('At 168 m, 30 frames are dropped');
    expect(challenge({ cable: 168, headroom: 10 }, 'longest-cable').reached).toBe(false);
    expect(challenge({ cable: 120, headroom: 10 }, 'longest-cable').reached).toBe(false);
    expect(challenge({ cable: 144, headroom: 11 }, 'longest-cable').reached).toBe(false);
  });
});
