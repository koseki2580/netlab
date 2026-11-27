/** REQ-446 — TSN: strict priority, the 802.1Qbv time-aware shaper and preemption (TC-2580..TC-2586). */
import { describe, expect, it } from 'vitest';
import {
  BEST_EFFORT_FRAME_BYTES,
  CONTROL_FRAME_BYTES,
  bound,
  cycleShares,
  frameTimeNs,
  gateControlList,
  wireBytes,
} from './tsn';

describe('TC-2580: a frame holds the link for its bytes plus preamble, SFD and gap', () => {
  it('a 1518-byte frame is 1538 bytes on the wire: 12.304 µs at 1 Gb/s', () => {
    expect(wireBytes(BEST_EFFORT_FRAME_BYTES)).toBe(1538);
    expect(frameTimeNs(BEST_EFFORT_FRAME_BYTES, 1000)).toBe(12_304);
  });
  it('a 64-byte control frame is 84 bytes: 0.672 µs at 1 Gb/s', () => {
    expect(frameTimeNs(CONTROL_FRAME_BYTES, 1000)).toBe(672);
  });
});

describe('TC-2581: strict priority cannot stop a frame already on the wire', () => {
  it('worst case at one hop is a whole best-effort frame plus its own: 12.976 µs', () => {
    expect(bound('priority', 1000)).toMatchObject({
      blockingNs: 12_304,
      worstPerHopNs: 12_976,
      bestNs: 672,
      jitterNs: 12_304,
      guardBandNs: 0,
    });
  });
});

describe('TC-2582: under 802.1Qbv the guard band leaves the window idle', () => {
  it('worst case is the control frame’s own 0.672 µs, with no jitter', () => {
    expect(bound('qbv', 1000)).toMatchObject({
      blockingNs: 0,
      worstPerHopNs: 672,
      jitterNs: 0,
      guardBandNs: 12_304,
    });
  });
});

describe('TC-2583: every hop adds its own worst case', () => {
  it('five hops: 64.88 µs with priority only, 3.36 µs with 802.1Qbv', () => {
    expect(bound('priority', 1000, 5).worstNs).toBe(64_880);
    expect(bound('priority', 1000, 5).jitterNs).toBe(61_520);
    expect(bound('qbv', 1000, 5).worstNs).toBe(3_360);
  });
});

describe('TC-2584: the gate control list repeats a window, best effort and a guard band', () => {
  it('at 1 Gb/s in a 250 µs cycle: 1 µs window, 236.696 µs best effort, 12.304 µs guard band', () => {
    expect(gateControlList(1000, false)).toEqual([
      { startNs: 0, durationNs: 1_000, open: 'critical' },
      { startNs: 1_000, durationNs: 236_696, open: 'best-effort' },
      { startNs: 237_696, durationNs: 12_304, open: 'closed' },
    ]);
    expect(cycleShares(1000, false).guardBand).toBeCloseTo(0.049216, 6);
  });
});

describe('TC-2585: preemption shrinks the blocking and the guard band to an unsplittable piece', () => {
  it('assumed 127-byte piece: 1.176 µs; priority + preemption worst 1.848 µs', () => {
    expect(bound('priority-preempt', 1000).worstPerHopNs).toBe(1_848);
    expect(bound('qbv-preempt', 1000)).toMatchObject({ worstPerHopNs: 672, guardBandNs: 1_176 });
    expect(cycleShares(1000, true).guardBand).toBeCloseTo(0.004704, 6);
  });
});

describe('TC-2586: the times scale with the link rate', () => {
  it('at 100 Mb/s the guard band takes 49.2 % of a 250 µs cycle; at 10 Gb/s 0.5 %', () => {
    expect(bound('priority', 100).worstPerHopNs).toBe(129_760);
    expect(cycleShares(100, false).guardBand).toBeCloseTo(0.49216, 5);
    expect(bound('priority', 10_000).worstPerHopNs).toBeCloseTo(1_297.6, 6);
    expect(cycleShares(10_000, false).guardBand).toBeCloseTo(0.0049216, 7);
  });
});
