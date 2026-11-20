/** REQ-409 — TCP window scaling and SACK (TC-2130..TC-2137). */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOST,
  LINK_BPS,
  MAX_UNSCALED_WINDOW,
  bdpBytes,
  cumulativeAck,
  maxSackBlocks,
  minShift,
  recovery,
  sackBlocks,
  scalingInUse,
  throughputBps,
  transfer,
} from './tcpOptions';

describe('TC-2130: without window scaling, throughput is at most 65,535 bytes per round trip', () => {
  it('10 ms: 52.4 Mbit/s; 50 ms: 10.5 Mbit/s; 150 ms: 3.5 Mbit/s', () => {
    expect(throughputBps(MAX_UNSCALED_WINDOW, 10)).toBeCloseTo(52_428_000, 0);
    expect(throughputBps(MAX_UNSCALED_WINDOW, 50)).toBeCloseTo(10_485_600, 0);
    expect(throughputBps(MAX_UNSCALED_WINDOW, 150)).toBeCloseTo(3_495_200, 0);
  });
});

describe('TC-2131: the bandwidth-delay product of 1 Gbit/s at 150 ms is 18.75 MB', () => {
  it('and 12.5 MB at 100 ms', () => {
    expect(bdpBytes(LINK_BPS, 150)).toBe(18_750_000);
    expect(bdpBytes(LINK_BPS, 100)).toBe(12_500_000);
  });
});

describe('TC-2132: the smallest shift is the first with 65,535 << shift ≥ the BDP', () => {
  it('18.75 MB needs shift 9 (8 gives only 16.8 MB); 65,535 bytes needs none', () => {
    expect(minShift(18_750_000)).toBe(9);
    expect(minShift(16_776_960)).toBe(8);
    expect(minShift(16_776_961)).toBe(9);
    expect(minShift(MAX_UNSCALED_WINDOW)).toBe(0);
  });
  it('beyond 65,535 << 14 (about 1 GB) no shift is enough', () => {
    expect(minShift(1_073_725_440)).toBe(14);
    expect(minShift(1_073_725_441)).toBeNull();
  });
});

describe('TC-2133: scaling is used only when both the SYN and the SYN-ACK carry the option', () => {
  it('both: on; either missing: off', () => {
    expect(scalingInUse(true, true)).toBe(true);
    expect(scalingInUse(true, false)).toBe(false);
    expect(scalingInUse(false, false)).toBe(false);
  });
  it('a 150 ms, 1 Gbit/s transfer fills the link with scaling, and drops to 3.5 Mbit/s when the option is stripped', () => {
    const scaled = transfer(LINK_BPS, 150, { offered: true, stripped: false });
    expect(scaled.shiftNeeded).toBe(9);
    expect(scaled.throughputBps).toBe(LINK_BPS);
    const stripped = transfer(LINK_BPS, 150, { offered: true, stripped: true });
    expect(stripped.windowBytes).toBe(MAX_UNSCALED_WINDOW);
    expect(stripped.throughputBps).toBeCloseTo(3_495_200, 0);
    expect(stripped.utilisation).toBeCloseTo(0.0035, 4);
  });
});

describe('TC-2134: with segments 5, 9 and 14 of 20 lost, the ACK says 5 and SACKs the three blocks above it', () => {
  it('cumulative ACK 5; blocks 15–21, 10–14, 6–9, newest first', () => {
    expect(cumulativeAck(20, DEFAULT_LOST)).toBe(5);
    expect(sackBlocks(20, DEFAULT_LOST, 4)).toEqual([
      { left: 15, right: 21 },
      { left: 10, right: 14 },
      { left: 6, right: 9 },
    ]);
  });
  it('adjacent losses make one hole; nothing lost means no blocks', () => {
    expect(sackBlocks(20, [3, 4, 10], 4)).toEqual([
      { left: 11, right: 21 },
      { left: 5, right: 10 },
    ]);
    expect(sackBlocks(20, [], 4)).toEqual([]);
  });
});

describe('TC-2135: at most 4 SACK blocks fit in the 40 bytes of options, 3 next to timestamps', () => {
  it('4 without timestamps, 3 with; extra blocks are cut, newest kept', () => {
    expect(maxSackBlocks(false)).toBe(4);
    expect(maxSackBlocks(true)).toBe(3);
    expect(sackBlocks(20, [2, 4, 6, 8, 10], 3)).toEqual([
      { left: 11, right: 21 },
      { left: 9, right: 10 },
      { left: 7, right: 8 },
    ]);
  });
});

describe('TC-2136: without SACK, recovery repairs one lost segment per round trip', () => {
  it('three losses take 3 round trips, in order', () => {
    expect(recovery(DEFAULT_LOST, false)).toEqual({
      roundTrips: 3,
      perRound: [[5], [9], [14]],
    });
  });
});

describe('TC-2137: with SACK, every hole is resent in one round trip', () => {
  it('three losses take 1 round trip; none take 0', () => {
    expect(recovery([14, 5, 9], true)).toEqual({ roundTrips: 1, perRound: [[5, 9, 14]] });
    expect(recovery([], true).roundTrips).toBe(0);
  });
});
