import { describe, expect, it } from 'vitest';
import { EditSession } from '../sandbox/EditSession';
import type { Edit } from '../sandbox/edits';
import type { SimulationState } from '../types/simulation';
import type { Scenario } from '../scenarios/types';
import type { NetworkTopology } from '../types/topology';
import {
  defaultAssessmentPassPredicate,
  isAssessmentConstraint,
  isAssessmentHint,
  isAssessmentRubric,
  isAssessmentSubgoal,
} from './rubric';
import type { AssessmentRubric } from './types';

function makeState(): SimulationState {
  return {
    status: 'idle',
    traces: [],
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  };
}

function makeRubric(overrides: Partial<AssessmentRubric> = {}): AssessmentRubric {
  return {
    id: 'rubric-1',
    goal: 'Deliver a packet through the backup path.',
    subgoals: [
      {
        id: 'required',
        title: 'Required goal',
        required: true,
        predicate: ({ state }) => state.status === 'idle',
        hints: [{ tier: 1, content: 'Start at routing.' }],
      },
    ],
    constraints: [],
    ...overrides,
  };
}

describe('assessment rubric helpers', () => {
  it('accepts a complete assessment hint', () => {
    expect(isAssessmentHint({ tier: 1, content: 'Look at routing.' })).toBe(true);
    expect(isAssessmentHint({ tier: 3, content: 'Set the backup link up.' })).toBe(true);
  });

  it('rejects malformed assessment hints', () => {
    expect(isAssessmentHint({ tier: 0, content: 'bad' })).toBe(false);
    expect(isAssessmentHint({ tier: 4, content: 'bad' })).toBe(false);
    expect(isAssessmentHint({ tier: 1 })).toBe(false);
  });

  it('accepts a complete assessment subgoal', () => {
    expect(isAssessmentSubgoal(makeRubric().subgoals[0])).toBe(true);
  });

  it('rejects subgoals without a predicate', () => {
    expect(
      isAssessmentSubgoal({
        id: 'missing-predicate',
        title: 'Missing predicate',
        required: true,
        hints: [],
      }),
    ).toBe(false);
  });

  it('accepts every supported constraint shape', () => {
    expect(isAssessmentConstraint({ kind: 'forbid-edit', editKind: 'node.nat.add' })).toBe(true);
    expect(
      isAssessmentConstraint({ kind: 'max-edit-count', editKind: 'node.route.add', max: 3 }),
    ).toBe(true);
    expect(isAssessmentConstraint({ kind: 'max-total-edits', max: 8 })).toBe(true);
  });

  it('rejects malformed constraints', () => {
    expect(isAssessmentConstraint({ kind: 'forbid-edit' })).toBe(false);
    expect(isAssessmentConstraint({ kind: 'max-edit-count', editKind: 'noop', max: -1 })).toBe(
      false,
    );
    expect(isAssessmentConstraint({ kind: 'max-total-edits', max: 0 })).toBe(false);
  });

  it('accepts a complete assessment rubric', () => {
    expect(isAssessmentRubric(makeRubric())).toBe(true);
  });

  it('rejects rubrics with zero subgoals', () => {
    expect(isAssessmentRubric(makeRubric({ subgoals: [] }))).toBe(false);
  });

  it('rejects rubrics with malformed time caps', () => {
    expect(isAssessmentRubric(makeRubric({ timeCap: { kind: 'wall', value: 0 } }))).toBe(false);
    expect(isAssessmentRubric(makeRubric({ timeCap: { kind: 'step', value: 10 } }))).toBe(true);
  });

  it('defaults pass behavior to all required subgoals', () => {
    const rubric = makeRubric({
      subgoals: [
        { id: 'required-a', title: 'A', required: true, predicate: () => true, hints: [] },
        { id: 'optional-b', title: 'B', required: false, predicate: () => false, hints: [] },
      ],
    });

    expect(
      defaultAssessmentPassPredicate(rubric, [
        { subgoalId: 'required-a', passed: true },
        { subgoalId: 'optional-b', passed: false },
      ]),
    ).toBe(true);
  });

  it('fails default pass behavior when any required subgoal fails', () => {
    const rubric = makeRubric({
      subgoals: [
        { id: 'required-a', title: 'A', required: true, predicate: () => true, hints: [] },
        { id: 'required-b', title: 'B', required: true, predicate: () => false, hints: [] },
      ],
    });

    expect(
      defaultAssessmentPassPredicate(rubric, [
        { subgoalId: 'required-a', passed: true },
        { subgoalId: 'required-b', passed: false },
      ]),
    ).toBe(false);
  });

  it('supports predicates reading state, events, and session', () => {
    const edit: Edit = { kind: 'noop' };
    const session = EditSession.empty().push(edit);
    const rubric = makeRubric({
      subgoals: [
        {
          id: 'combined',
          title: 'Combined input',
          required: true,
          predicate: ({ state, events, session }) =>
            state.status === 'idle' &&
            events[0]?.name === 'sandbox:edit-applied' &&
            session.size() === 1,
          hints: [],
        },
      ],
    });

    expect(
      rubric.subgoals[0]?.predicate({
        state: makeState(),
        events: [{ name: 'sandbox:edit-applied', payload: { edit }, stepIndex: 0 }],
        session,
      }),
    ).toBe(true);
  });

  it('allows scenarios to carry an optional assessment rubric', () => {
    const topology: NetworkTopology = { nodes: [], edges: [], areas: [], routeTables: new Map() };
    const scenario: Scenario = {
      metadata: {
        id: 'assessment-scenario',
        title: 'Assessment Scenario',
        summary: 'summary',
        objective: 'objective',
        difficulty: 'core',
        protocols: ['OSPF'],
        prerequisiteIds: [],
      },
      topology,
      assessmentRubric: makeRubric(),
    };

    expect(scenario.assessmentRubric?.id).toBe('rubric-1');
  });
});
