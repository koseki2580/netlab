import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { fromEngine } from '../../SimulationSnapshot';
import { reduceAnnotation } from '../reducer';
import type { TraceAnnotation, TraceAnnotationEdit } from '../types';

const PROPERTY_SEED = 0x5a4b69;

const scenarioAnnotation: TraceAnnotation = {
  id: 'scenario-note',
  traceEventId: 'trace-1:0',
  author: 'scenario',
  content: 'locked',
  createdAt: 0,
};

const scenarioMutationArb: fc.Arbitrary<TraceAnnotationEdit> = fc.oneof(
  fc.record({
    kind: fc.constant('trace.annotate.edit' as const),
    id: fc.constant(scenarioAnnotation.id),
    before: fc.string({ maxLength: 80 }),
    after: fc.string({ maxLength: 80 }),
  }),
  fc.record({
    kind: fc.constant('trace.annotate.remove' as const),
    id: fc.constant(scenarioAnnotation.id),
    before: fc.constant(scenarioAnnotation),
  }),
);

function snapshot() {
  return {
    ...fromEngine(new SimulationEngine(directTopology(), new HookEngine())),
    annotations: [scenarioAnnotation],
  };
}

describe('scenario annotation immutability', () => {
  it('keeps scenario-authored annotations byte-equal under edit/remove sequences', () => {
    fc.assert(
      fc.property(fc.array(scenarioMutationArb, { maxLength: 32 }), (edits) => {
        const base = snapshot();
        const result = edits.reduce(reduceAnnotation, base);

        expect(result.annotations).toEqual(base.annotations);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });
});
