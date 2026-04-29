import { describe, expect, it } from 'vitest';
import type { SimulationSnapshot } from '../types';
import { isTraceAnnotation, isTraceAnnotationEditWithKind } from './edits';
import { reduceAnnotation } from './reducer';
import type { TraceAnnotation, TraceAnnotationEdit } from './types';

function annotation(overrides: Partial<TraceAnnotation> = {}): TraceAnnotation {
  return {
    id: 'annotation-1',
    traceEventId: 'event-1',
    author: 'user',
    content: 'original',
    createdAt: 3,
    ...overrides,
  };
}

function snapshot(
  annotations: readonly TraceAnnotation[] = [],
): SimulationSnapshot & { readonly annotations: readonly TraceAnnotation[] } {
  return Object.freeze({
    id: 'snapshot-1',
    capturedAt: 3,
    topology: Object.freeze({ nodes: [], edges: [] }),
    state: Object.freeze({
      status: 'paused',
      currentStep: 3,
      traces: [],
      currentTraceId: null,
      selectedPacket: null,
      selectedHop: null,
      traceColors: {},
      packets: [],
    }),
    parameters: Object.freeze({
      tcp: Object.freeze({ initialWindow: 65535, mss: 1460, rto: 1000 }),
      ospf: Object.freeze({ helloIntervalMs: 10000, deadIntervalMs: 40000 }),
      arp: Object.freeze({ cacheTtlMs: 1800000 }),
      engine: Object.freeze({ tickMs: 100, maxTtl: 64 }),
    }),
    annotations,
  } as unknown as SimulationSnapshot & { readonly annotations: readonly TraceAnnotation[] });
}

describe('trace annotation edits', () => {
  it('recognizes a valid trace annotation', () => {
    expect(isTraceAnnotation(annotation())).toBe(true);
  });

  it('rejects an annotation with an invalid author', () => {
    expect(isTraceAnnotation({ ...annotation(), author: 'teacher' })).toBe(false);
  });

  it('recognizes add edits by kind', () => {
    const guard = isTraceAnnotationEditWithKind('trace.annotate.add');

    expect(guard({ kind: 'trace.annotate.add', annotation: annotation() })).toBe(true);
    expect(guard({ kind: 'trace.annotate.remove', id: 'annotation-1' })).toBe(false);
  });

  it('recognizes edit edits by kind', () => {
    const guard = isTraceAnnotationEditWithKind('trace.annotate.edit');

    expect(
      guard({
        kind: 'trace.annotate.edit',
        id: 'annotation-1',
        before: 'before',
        after: 'after',
      }),
    ).toBe(true);
  });

  it('recognizes remove edits by kind', () => {
    const guard = isTraceAnnotationEditWithKind('trace.annotate.remove');

    expect(
      guard({
        kind: 'trace.annotate.remove',
        id: 'annotation-1',
        before: annotation(),
      }),
    ).toBe(true);
  });
});

describe('reduceAnnotation', () => {
  it('adds a new annotation', () => {
    const base = snapshot();
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.add',
      annotation: annotation(),
    });

    expect(next.annotations).toEqual([annotation()]);
  });

  it('rejects a duplicate annotation id', () => {
    const base = snapshot([annotation()]);
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.add',
      annotation: annotation({ content: 'duplicate' }),
    });

    expect(next).toBe(base);
  });

  it('edits a user annotation', () => {
    const base = snapshot([annotation()]);
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.edit',
      id: 'annotation-1',
      before: 'original',
      after: 'updated',
    });

    expect(next.annotations[0]?.content).toBe('updated');
  });

  it('does not edit a scenario annotation', () => {
    const base = snapshot([annotation({ author: 'scenario' })]);
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.edit',
      id: 'annotation-1',
      before: 'original',
      after: 'updated',
    });

    expect(next).toBe(base);
  });

  it('no-ops when editing an unknown annotation id', () => {
    const base = snapshot([annotation()]);
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.edit',
      id: 'missing',
      before: 'original',
      after: 'updated',
    });

    expect(next).toBe(base);
  });

  it('removes a user annotation', () => {
    const base = snapshot([annotation()]);
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.remove',
      id: 'annotation-1',
      before: annotation(),
    });

    expect(next.annotations).toEqual([]);
  });

  it('does not remove a scenario annotation', () => {
    const base = snapshot([annotation({ author: 'scenario' })]);
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.remove',
      id: 'annotation-1',
      before: annotation({ author: 'scenario' }),
    });

    expect(next).toBe(base);
  });

  it('no-ops when removing an unknown annotation id', () => {
    const base = snapshot([annotation()]);
    const next = reduceAnnotation(base, {
      kind: 'trace.annotate.remove',
      id: 'missing',
      before: annotation({ id: 'missing' }),
    });

    expect(next).toBe(base);
  });

  it('never mutates the input snapshot', () => {
    const existing = annotation();
    const base = snapshot([existing]);

    reduceAnnotation(base, {
      kind: 'trace.annotate.edit',
      id: existing.id,
      before: existing.content,
      after: 'updated',
    });

    expect(base.annotations).toEqual([existing]);
  });

  it('is deterministic under repeated invocation', () => {
    const base = snapshot();
    const edit: TraceAnnotationEdit = {
      kind: 'trace.annotate.add',
      annotation: annotation(),
    };

    expect(reduceAnnotation(base, edit)).toEqual(reduceAnnotation(base, edit));
  });

  it('returns the original snapshot for an unknown edit kind', () => {
    const base = snapshot();

    expect(reduceAnnotation(base, { kind: 'future.annotation' } as never)).toBe(base);
  });
});
