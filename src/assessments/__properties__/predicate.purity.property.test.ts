import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EditSession } from '../../sandbox/EditSession';
import type { Edit } from '../../sandbox/edits';
import { scenarioRegistry } from '../../scenarios';
import { predicateInputArb } from '../../testing/properties/arbitraries';

const SEED = 0x5a4b72;

const editArb: fc.Arbitrary<Edit> = fc.constantFrom<Edit>(
  { kind: 'noop' },
  {
    kind: 'link.state',
    target: { kind: 'edge', edgeId: 'e-r2-r4' },
    before: 'up',
    after: 'down',
  },
);

const assessmentInputArb = fc.record({
  state: predicateInputArb.map((input) => input.state),
  events: predicateInputArb.map((input) => input.events),
  session: fc
    .array(editArb, { maxLength: 6 })
    .map((edits) => edits.reduce((session, edit) => session.push(edit), EditSession.empty())),
});

describe('assessment predicates are deterministic and side-effect free', () => {
  for (const scenario of scenarioRegistry.list()) {
    const rubric = scenario.assessmentRubric;
    if (!rubric) continue;

    for (const subgoal of rubric.subgoals) {
      it(`${rubric.id}/${subgoal.id} returns a stable result without mutating its input`, () => {
        fc.assert(
          fc.property(assessmentInputArb, (input) => {
            const before = structuredClone({
              state: input.state,
              events: input.events,
              sessionEdits: input.session.edits,
            });
            const results = Array.from({ length: 10 }, () => subgoal.predicate(input));

            expect(results.every((result) => result === results[0])).toBe(true);
            expect({
              state: input.state,
              events: input.events,
              sessionEdits: input.session.edits,
            }).toEqual(before);
          }),
          { seed: SEED, numRuns: 100 },
        );
      });
    }
  }
});
