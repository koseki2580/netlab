import { describe, expect, it } from 'vitest';
import { normalizeLinkQos, hasActiveLinkQos } from './link';

describe('link QoS types', () => {
  it('normalizes missing fields to legacy instant-link defaults', () => {
    expect(normalizeLinkQos(undefined)).toEqual({
      bandwidthBps: Infinity,
      propagationDelayMs: 0,
      lossPct: 0,
      queueDepthSegments: Infinity,
      lossSeed: undefined,
    });
  });

  it('treats all-default config as inactive', () => {
    expect(hasActiveLinkQos({})).toBe(false);
    expect(hasActiveLinkQos({ bandwidthBps: Infinity, propagationDelayMs: 0, lossPct: 0 })).toBe(
      false,
    );
  });

  it('treats finite bandwidth, propagation delay, loss, or finite queue depth as active', () => {
    expect(hasActiveLinkQos({ bandwidthBps: 1_000_000 })).toBe(true);
    expect(hasActiveLinkQos({ propagationDelayMs: 20 })).toBe(true);
    expect(hasActiveLinkQos({ lossPct: 5, lossSeed: 42 })).toBe(true);
    expect(hasActiveLinkQos({ queueDepthSegments: 100 })).toBe(true);
  });
});
