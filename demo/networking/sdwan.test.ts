/** REQ-376 — SD-WAN: each kind of traffic takes the cheapest link that meets its needs (TC-1820..TC-1822). */
import { describe, expect, it } from 'vitest';
import { POLICIES, UPLINKS, choose, misses } from './sdwan';

const policy = (id: string) => POLICIES.find((candidate) => candidate.id === id)!;
const timeline = (id: string) => [0, 1, 2, 3].map((period) => choose(policy(id), period));

describe('TC-1820: calls and meetings leave the cheap line when it degrades, and come back', () => {
  it('voice: internet, then LTE in the rush (it meets voice and is cheaper than MPLS), then internet', () => {
    expect(timeline('voice')).toEqual(['internet', 'lte', 'internet', 'internet']);
  });
  it('video, stricter on loss: LTE’s 1 % is too much, so MPLS in the rush; 0.5 % after it is just within', () => {
    expect(timeline('video')).toEqual(['internet', 'mpls', 'internet', 'internet']);
  });
});

describe('TC-1821: bulk traffic stays on the cheapest line through the rush', () => {
  it('backup never leaves the internet line', () => {
    expect(timeline('backup')).toEqual(['internet', 'internet', 'internet', 'internet']);
  });
});

describe('TC-1822: why a link is left is named by the measurements that fail', () => {
  it('in the rush the internet line fails voice on jitter and loss, not latency', () => {
    const internet = UPLINKS.find((link) => link.id === 'internet')!;
    expect(misses(internet, policy('voice'), 1)).toEqual(['jitter 40 > 30 ms', 'loss 3 > 1 %']);
    expect(misses(internet, policy('voice'), 0)).toEqual([]);
  });
});
