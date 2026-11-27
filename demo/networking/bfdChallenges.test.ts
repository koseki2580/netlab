/** REQ-449 — the BFD lesson's challenges, checked by the detection model (TC-2668). */
import { describe, expect, it } from 'vitest';
import { bfdDetector, outage } from './bfd';
import { START_TIMERS, bfdChallenges, type BfdTimers } from './bfdChallenges';

const challenge = (timers: BfdTimers, id: string) => {
  const found = bfdChallenges(timers).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2668: the BFD challenges are reached by the timers the model says reach them', () => {
  it('none is reached on the starting 300 ms × 3', () => {
    expect(bfdChallenges(START_TIMERS).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('loss-limit: 100 ms × 3 loses 500 packets; 150 ms × 3 loses 650; 50 ms is not the longest', () => {
    const timers: BfdTimers = { intervalMs: 100, multiplier: 3 };
    const reached = challenge(timers, 'loss-limit');
    expect(reached.reached).toBe(true);
    expect(outage(bfdDetector(100, 3), 0).lostPackets).toBe(500);
    expect(reached.why.en).toContain('500 ms');
    expect(reached.why.en).toContain('500 packets');
    expect(reached.why.en).toContain('650');
    expect(reached.why.ja).toContain('500 パケット');
    expect(challenge({ ...timers, intervalMs: 150 }, 'loss-limit').reached).toBe(false);
    expect(challenge({ ...timers, intervalMs: 50 }, 'loss-limit').reached).toBe(false);
    expect(challenge({ intervalMs: 100, multiplier: 2 }, 'loss-limit').reached).toBe(false);
  });

  it('same-detection: 450 ms × 2 also detects in 900 ms; 400 ms × 2 does not, nor 300 ms × 3 itself', () => {
    const reached = challenge({ intervalMs: 450, multiplier: 2 }, 'same-detection');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('900 ms');
    expect(reached.why.en).toContain('2 missed packets');
    expect(reached.why.ja).toContain('900 ms');
    expect(challenge({ intervalMs: 400, multiplier: 2 }, 'same-detection').reached).toBe(false);
    expect(challenge(START_TIMERS, 'same-detection').reached).toBe(false);
  });

  it('patient-quick: 200 ms × 5 detects in 1000 ms at 5 packets a second; 250 ms takes 1250 ms; 150 ms is not the fewest', () => {
    const timers: BfdTimers = { intervalMs: 200, multiplier: 5 };
    const reached = challenge(timers, 'patient-quick');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('1000 ms');
    expect(reached.why.en).toContain('5 BFD packets a second');
    expect(reached.why.en).toContain('1250 ms');
    expect(reached.why.ja).toContain('1250 ms');
    expect(challenge({ ...timers, intervalMs: 250 }, 'patient-quick').reached).toBe(false);
    expect(challenge({ ...timers, intervalMs: 150 }, 'patient-quick').reached).toBe(false);
    expect(challenge({ intervalMs: 200, multiplier: 4 }, 'patient-quick').reached).toBe(false);
  });
});
