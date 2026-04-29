import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { fromEngine } from '../../SimulationSnapshot';
import { reduceAnnotation } from '../reducer';
import type { TraceAnnotation, TraceAnnotationEdit } from '../types';

const PROPERTY_SEED = 0x5a4b69;

const annotationArb: fc.Arbitrary<TraceAnnotation> = fc
  .record({
    id: fc.string({ minLength: 1, maxLength: 12 }),
    traceEventId: fc.string({ minLength: 1, maxLength: 16 }),
    author: fc.constantFrom<'user' | 'scenario'>('user', 'scenario'),
    content: fc.string({ maxLength: 80 }),
    createdAt: fc.integer({ min: -1, max: 100 }),
    color: fc.option(fc.string({ minLength: 1, maxLength: 12 }), { nil: undefined }),
  })
  .map(
    ({ color, ...annotation }): TraceAnnotation =>
      color === undefined ? annotation : { ...annotation, color },
  );

const editArb: fc.Arbitrary<TraceAnnotationEdit> = fc.oneof(
  annotationArb.map((annotation) => ({ kind: 'trace.annotate.add', annotation }) as const),
  fc.record({
    kind: fc.constant('trace.annotate.edit' as const),
    id: fc.string({ minLength: 1, maxLength: 12 }),
    before: fc.string({ maxLength: 80 }),
    after: fc.string({ maxLength: 80 }),
  }),
  fc.record({
    kind: fc.constant('trace.annotate.remove' as const),
    id: fc.string({ minLength: 1, maxLength: 12 }),
    before: annotationArb,
  }),
);

function snapshot(annotations: readonly TraceAnnotation[] = []) {
  return {
    ...fromEngine(new SimulationEngine(directTopology(), new HookEngine())),
    annotations,
  };
}

describe('reduceAnnotation totality', () => {
  it('never throws for generated annotation edits', () => {
    fc.assert(
      fc.property(fc.array(annotationArb, { maxLength: 8 }), editArb, (annotations, edit) => {
        expect(() => reduceAnnotation(snapshot(annotations), edit)).not.toThrow();
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });

  it('returns the original snapshot for unknown edit shapes', () => {
    fc.assert(
      fc.property(fc.anything(), (edit) => {
        const base = snapshot();

        expect(reduceAnnotation(base, edit as never)).toBe(base);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });
});
