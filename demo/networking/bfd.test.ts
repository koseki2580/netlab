/** REQ-387 — BFD and failure detection (TC-1910..TC-1912). */
import { describe, expect, it } from 'vitest';
import { DETECTORS, bfdDetector, detectionMs, detectionRange, outage } from './bfd';

const detector = (id: string) => DETECTORS.find((entry) => entry.id === id)!;

describe('TC-1910: a failure just after a hello is noticed only when the dead timer runs out', () => {
  it('default OSPF: 40 s; tuned OSPF: 4 s; BFD 300 × 3: 900 ms; BFD 50 × 3: 150 ms', () => {
    expect(DETECTORS.map((d) => detectionMs(d, 0))).toEqual([40_000, 4_000, 900, 150]);
  });
  it('a failure later in the hello cycle is noticed sooner, never sooner than dead − interval', () => {
    expect(detectionMs(detector('ospf-default'), 9_000)).toBe(31_000);
    expect(detectionRange(detector('ospf-default'))).toEqual({ worst: 40_000, best: 30_001 });
  });
});

describe('TC-1911: the outage is detection plus reconvergence, and packets are lost all along', () => {
  it('default OSPF loses 40 200 packets at 1000 per second; BFD 50 × 3 loses 350', () => {
    expect(outage(detector('ospf-default'), 0)).toEqual({
      detectMs: 40_000,
      outageMs: 40_200,
      lostPackets: 40_200,
    });
    expect(outage(detector('bfd-50'), 0)).toEqual({
      detectMs: 150,
      outageMs: 350,
      lostPackets: 350,
    });
  });
});

describe('TC-1912: BFD detection is interval × multiplier', () => {
  it('100 ms × 5 is 500 ms; 1 s × 3 is 3 s', () => {
    expect(detectionMs(bfdDetector(100, 5), 0)).toBe(500);
    expect(detectionMs(bfdDetector(1000, 3), 0)).toBe(3000);
  });
});
