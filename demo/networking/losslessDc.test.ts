/** REQ-435 — lossless data-centre Ethernet: incast, PFC, headroom, ECN (TC-2460..TC-2466). */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, MODES, headroomBytes, headroomFrames, simulate } from './losslessDc';

const pfcWith = (cableMetres: number, headroom: number) =>
  simulate('pfc', { ...DEFAULT_CONFIG, cableMetres, headroomFrames: headroom });

describe('TC-2460: PFC headroom ≈ 2 × rate × cable delay + 2 × MTU', () => {
  it('100 Gb/s, 1,500-byte frames: 96 m needs 15,000 bytes (10 frames), 100 m 15,500 bytes', () => {
    expect(headroomBytes(96)).toBe(15_000);
    expect(headroomFrames(96)).toBe(10);
    expect(headroomBytes(100)).toBe(15_500);
  });
  it('the cable term grows with length: 24 m → 4 frames, 192 m → 18 frames', () => {
    expect(headroomFrames(24)).toBe(4);
    expect(headroomFrames(192)).toBe(18);
  });
});

describe('TC-2461: plain Ethernet tail-drops an 8-to-1 incast', () => {
  it('512 frames into a 160-frame buffer: 257 dropped, 255 delivered; V, on the idle port, loses nothing', () => {
    const plain = simulate('plain');
    expect(plain).toMatchObject({ offered: 512, drops: 257, delivered: 255, maxQueue: 160 });
    expect(plain.innocentSent).toBe(plain.innocentMax);
  });
});

describe('TC-2462: PFC with enough headroom loses nothing', () => {
  it('every one of the 512 frames is delivered after 6 XOFFs', () => {
    expect(simulate('pfc')).toMatchObject({ drops: 0, delivered: 512, pauses: 6 });
  });
  it('the queue never passes the buffer, and E1 sends at most one frame per tick', () => {
    const pfc = simulate('pfc');
    expect(Math.max(...pfc.queue)).toBeLessThanOrEqual(DEFAULT_CONFIG.bufferFrames);
    expect(pfc.finishTick).toBeGreaterThanOrEqual(pfc.offered - 1);
  });
});

describe('TC-2463: PFC pauses the innocent flow that shares a paused link', () => {
  it('V goes to an idle port, yet gets only 174 of its 350 turns, against 350 without PFC', () => {
    const pfc = simulate('pfc');
    expect(pfc).toMatchObject({ innocentSent: 174, innocentMax: 350, pausedTicks: 347 });
    expect(simulate('plain').innocentSent).toBe(350);
  });
});

describe('TC-2464: too little headroom drops frames even with PFC', () => {
  it('96 m: 6 frames of headroom drops 13, 8 frames drops none', () => {
    expect(pfcWith(96, 6).drops).toBe(13);
    expect(pfcWith(96, 8).drops).toBe(0);
  });
  it('a longer cable needs more: 192 m with 10 frames drops 65; its estimate of 18 drops none', () => {
    expect(pfcWith(192, 10).drops).toBe(65);
    expect(pfcWith(192, headroomFrames(192)).drops).toBe(0);
  });
});

describe('TC-2465: ECN marks slow the senders before the buffer fills, so PFC rarely fires', () => {
  it('309 marks, 1 XOFF for 18 ticks instead of 347, no drops, and V gets 341 of 350 turns', () => {
    expect(simulate('pfc-ecn')).toMatchObject({
      drops: 0,
      delivered: 512,
      marks: 309,
      pauses: 1,
      pausedTicks: 18,
      innocentSent: 341,
    });
  });
  it('the queue peaks lower than with PFC alone: 94 against 131 frames', () => {
    expect(simulate('pfc-ecn').maxQueue).toBe(94);
    expect(simulate('pfc').maxQueue).toBe(131);
  });
});

describe('TC-2466: every frame is either delivered or dropped, and lossless costs time', () => {
  it('delivered + dropped = 512 in each mode; plain is done at tick 258 with half lost, PFC at tick 515 with none', () => {
    for (const mode of MODES) {
      const outcome = simulate(mode);
      expect(outcome.delivered + outcome.drops, mode).toBe(512);
    }
    expect(simulate('plain').finishTick).toBe(258);
    expect(simulate('pfc').finishTick).toBe(515);
  });
});
