/** REQ-382 — streaming telemetry: what a 5-minute poll and a 10-second stream see (TC-1860..TC-1862). */
import { describe, expect, it } from 'vitest';
import { peak, polledStatus, readings, statusChanges } from './telemetry';

describe('TC-1860: the five-minute poll averages the burst away', () => {
  it('the poll’s busiest reading is about 21 %; the 10-second stream shows 100 %', () => {
    expect(peak(readings(300))).toBe(20.7);
    expect(peak(readings(10))).toBe(100);
  });
});

describe('TC-1861: the poll misses the outage entirely', () => {
  it('both polls find the link up; ON_CHANGE reports down at 400 s and up at 430 s', () => {
    expect(polledStatus().map((p) => p.status)).toEqual(['UP', 'UP']);
    expect(statusChanges()).toEqual([
      { at: 400, status: 'DOWN' },
      { at: 430, status: 'UP' },
    ]);
  });
});

describe('TC-1862: the outage does show in the stream’s counters as zero traffic', () => {
  it('the 10-second readings for 400–430 s are 0 %, and the poll covering them is only lower', () => {
    const stream = readings(10);
    expect(stream.filter((r) => r.at > 400 && r.at <= 430).map((r) => r.utilPct)).toEqual([
      0, 0, 0,
    ]);
    expect(readings(300)[1]!.utilPct).toBe(13.5);
  });
});
