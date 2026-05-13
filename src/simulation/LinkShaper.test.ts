import { describe, expect, it } from 'vitest';
import { LinkShaper } from './LinkShaper';
import type { QueuedSegment } from './LinkQueue';
import type { LinkShaperConfig } from '../types/link';

const SHAPER: LinkShaperConfig = {
  classes: [
    { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 10 },
    { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 10, default: true },
  ],
};

function queued(id: string, bytes = 1000): QueuedSegment {
  return {
    segment: { id, byteLength: bytes },
    enqueuedAtStep: 0,
    seq: Number(id.replace(/\D/g, '') || 1),
  };
}

describe('LinkShaper', () => {
  it('classifies configured DSCP values and falls back to the default class', () => {
    expect(LinkShaper.classifyDscp(SHAPER, 46)).toBe(0);
    expect(LinkShaper.classifyDscp(SHAPER, 0)).toBe(1);
    expect(LinkShaper.classifyDscp(SHAPER, 10)).toBe(1);
  });

  it('enforces per-class queue depth with class-queue-full drops', () => {
    const shaper = new LinkShaper({
      classes: [{ id: 'be', dscp: [], weightPct: 100, queueDepthSegments: 1, default: true }],
    });

    expect(shaper.enqueue(queued('seg-1'), 0, 0)).toMatchObject({ status: 'enqueued' });
    expect(shaper.enqueue(queued('seg-2'), 0, 0)).toMatchObject({
      status: 'dropped',
      reason: 'class-queue-full',
      classId: 'be',
    });
  });

  it('drains higher-weight classes more often under sustained backlog', () => {
    const shaper = new LinkShaper(SHAPER, 10);
    for (let index = 0; index < 10; index += 1) {
      shaper.enqueue(queued(`ef-${index}`, 500), 46, 0);
      shaper.enqueue(queued(`be-${index}`, 500), 0, 0);
    }

    const drained = Array.from({ length: 10 }, () => shaper.drainOneSlot()?.classId).filter(
      Boolean,
    );

    expect(drained.filter((classId) => classId === 'ef').length).toBeGreaterThan(
      drained.filter((classId) => classId === 'be').length,
    );
  });
});
