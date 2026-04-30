import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AssessmentRunner } from '../AssessmentRunner';
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

const runnerInputArb = fc.record({
  state: predicateInputArb.map((input) => input.state),
  events: predicateInputArb.map((input) => input.events),
  session: fc
    .array(editArb, { maxLength: 6 })
    .map((edits) => edits.reduce((session, edit) => session.push(edit), EditSession.empty())),
});

describe('assessment rubric evaluation is deterministic', () => {
  for (const scenario of scenarioRegistry.list()) {
    const rubric = scenario.assessmentRubric;
    if (!rubric) continue;

    it(`${rubric.id} produces stable status for identical inputs`, () => {
      fc.assert(
        fc.property(runnerInputArb, (input) => {
          const statuses = Array.from({ length: 10 }, () => {
            const runner = new AssessmentRunner(rubric, { now: () => 1000 });
            runner.onSimulationState(input.state, input.events, input.session);
            return runner.status;
          });

          expect(
            statuses.every((status) => JSON.stringify(status) === JSON.stringify(statuses[0])),
          ).toBe(true);
        }),
        { seed: SEED, numRuns: 100 },
      );
    });
  }
});
