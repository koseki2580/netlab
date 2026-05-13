import { describe, expect, it } from 'vitest';
import { LinkQueue, stepsToPropagate, stepsToTransmit } from './LinkQueue';

function segment(id: string, bytes = 1500) {
  return {
    id,
    byteLength: bytes,
  };
}

describe('LinkQueue', () => {
  it('converts bandwidth and propagation to whole simulation steps', () => {
    expect(stepsToTransmit(1500, 1_000_000)).toBe(12);
    expect(stepsToTransmit(1500, 1_000_000_000)).toBe(1);
    expect(stepsToTransmit(1500, Infinity)).toBe(0);
    expect(stepsToPropagate(20.1)).toBe(21);
  });

  it('delivers one segment after serialization plus propagation delay', () => {
    const queue = new LinkQueue({ bandwidthBps: 1_000_000, propagationDelayMs: 20 });

    expect(queue.enqueue(segment('a'), 0)).toEqual({
      status: 'enqueued',
      segSeq: 1,
      queueDepth: 1,
    });

    const delivered: string[] = [];
    for (let step = 0; step <= 32; step += 1) {
      delivered.push(...queue.tickStep(step).arrived.map((entry) => entry.segment.id));
    }

    expect(delivered).toEqual(['a']);
    expect(queue.getState().counters).toMatchObject({ enqueued: 1, dequeued: 1, dropped: 0 });
  });

  it('drops beyond finite queue capacity', () => {
    const queue = new LinkQueue({ queueDepthSegments: 2 });

    expect(queue.enqueue(segment('a'), 0).status).toBe('enqueued');
    expect(queue.enqueue(segment('b'), 0).status).toBe('enqueued');
    expect(queue.enqueue(segment('c'), 0)).toEqual({
      status: 'dropped',
      reason: 'queue-full',
      segSeq: 3,
      queueDepth: 2,
    });
  });

  it('uses seeded loss deterministically', () => {
    const cfg = { lossPct: 50, lossSeed: 42 };

    expect(Array.from({ length: 8 }, (_, index) => LinkQueue.shouldDrop(cfg, index + 1))).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it('delegates queueing to a DSCP shaper when configured', () => {
    const queue = new LinkQueue({
      shaper: {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 4 },
          { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 4, default: true },
        ],
      },
    });

    expect(queue.enqueue(segment('be-1', 500), 0, 0)).toMatchObject({
      status: 'enqueued',
      classId: 'be',
    });
    expect(queue.enqueue(segment('ef-1', 500), 0, 46)).toMatchObject({
      status: 'enqueued',
      classId: 'ef',
    });

    const result = queue.tickStep(1);

    expect(result.dequeued[0]).toMatchObject({ classId: 'ef' });
    expect(queue.getState().shaper?.classes.find((klass) => klass.id === 'be')?.queue).toHaveLength(
      1,
    );
  });
});
