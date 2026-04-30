import { describe, expect, it } from 'vitest';
import { EditSession } from '../sandbox/EditSession';
import type { Edit } from '../sandbox/edits';
import { checkAssessmentConstraints } from './constraints';
import type { AssessmentRubric } from './types';

function makeRubric(constraints: AssessmentRubric['constraints']): AssessmentRubric {
  return {
    id: 'rubric-1',
    goal: 'goal',
    subgoals: [{ id: 'goal', title: 'Goal', required: true, predicate: () => true, hints: [] }],
    constraints,
  };
}

const noop: Edit = { kind: 'noop' };
const routeAdd: Edit = {
  kind: 'node.route.add',
  target: { kind: 'node', nodeId: 'r1' },
  route: { id: 'r1', prefix: '10.0.0.0/24', nextHop: '10.0.0.1', outInterface: 'eth0', metric: 1 },
};

describe('assessment constraint checks', () => {
  it('allows edits when the rubric has no constraints', () => {
    expect(checkAssessmentConstraints(makeRubric([]), noop, EditSession.empty())).toBeNull();
  });

  it('rejects a forbidden edit kind', () => {
    expect(
      checkAssessmentConstraints(
        makeRubric([{ kind: 'forbid-edit', editKind: 'node.route.add' }]),
        routeAdd,
        EditSession.empty(),
      ),
    ).toEqual({
      reason: 'assessment-constraint-violated',
      constraint: { kind: 'forbid-edit', editKind: 'node.route.add' },
    });
  });

  it('allows non-matching forbidden edit kinds', () => {
    expect(
      checkAssessmentConstraints(
        makeRubric([{ kind: 'forbid-edit', editKind: 'node.route.add' }]),
        noop,
        EditSession.empty(),
      ),
    ).toBeNull();
  });

  it('rejects edits once max total edits is reached', () => {
    expect(
      checkAssessmentConstraints(
        makeRubric([{ kind: 'max-total-edits', max: 1 }]),
        routeAdd,
        EditSession.empty().push(noop),
      )?.constraint,
    ).toEqual({ kind: 'max-total-edits', max: 1 });
  });

  it('allows edits while max total edits has room', () => {
    expect(
      checkAssessmentConstraints(
        makeRubric([{ kind: 'max-total-edits', max: 2 }]),
        routeAdd,
        EditSession.empty().push(noop),
      ),
    ).toBeNull();
  });

  it('rejects a kind once max edit count is reached', () => {
    expect(
      checkAssessmentConstraints(
        makeRubric([{ kind: 'max-edit-count', editKind: 'noop', max: 1 }]),
        noop,
        EditSession.empty().push(noop),
      )?.constraint,
    ).toEqual({ kind: 'max-edit-count', editKind: 'noop', max: 1 });
  });

  it('allows other kinds when a max edit count applies to a different kind', () => {
    expect(
      checkAssessmentConstraints(
        makeRubric([{ kind: 'max-edit-count', editKind: 'noop', max: 1 }]),
        routeAdd,
        EditSession.empty().push(noop),
      ),
    ).toBeNull();
  });

  it('ignores redo-tail edits when enforcing edit counts', () => {
    const session = EditSession.empty().push(noop).undo();

    expect(
      checkAssessmentConstraints(
        makeRubric([{ kind: 'max-total-edits', max: 1 }]),
        routeAdd,
        session,
      ),
    ).toBeNull();
  });
});
