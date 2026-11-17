/** REQ-377 — L4S: early ECN marks keep the queue short and the line full (TC-1830..TC-1832). */
import { describe, expect, it } from 'vitest';
import { simulate } from './l4s';

describe('TC-1830: a classic sender must choose between delay and a full line', () => {
  it('a deep buffer keeps the line nearly full, but the queue reaches 20 ms', () => {
    const deep = simulate('classic-deep');
    expect(deep.utilisationPct).toBeGreaterThan(95);
    expect(deep.maxDelayMs).toBe(20);
    expect(deep.drops).toBeGreaterThan(0);
  });
  it('a shallow buffer keeps delay low, but halving leaves the line idle', () => {
    const shallow = simulate('classic-shallow');
    expect(shallow.maxDelayMs).toBeLessThanOrEqual(4);
    expect(shallow.utilisationPct).toBeLessThan(90);
  });
});

describe('TC-1831: an L4S sender keeps the line full with a short queue and loses nothing', () => {
  it('full line, worst delay under a third of the deep buffer’s, no drops, only marks', () => {
    const l4s = simulate('l4s');
    expect(l4s.utilisationPct).toBe(100);
    expect(l4s.maxDelayMs).toBeLessThan(simulate('classic-deep').maxDelayMs / 3);
    expect(l4s.drops).toBe(0);
    expect(l4s.marks).toBeGreaterThan(0);
  });
});

describe('TC-1832: the signal differs — classic senders hear of a full queue by loss, L4S by marks', () => {
  it('classic runs mark nothing; the L4S run drops nothing', () => {
    expect(simulate('classic-deep').marks).toBe(0);
    expect(simulate('classic-shallow').marks).toBe(0);
    expect(simulate('l4s').rounds.every((round) => round.dropped === 0)).toBe(true);
  });
});
