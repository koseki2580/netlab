import { describe, expect, it, vi } from 'vitest';
import { EditSession } from '../sandbox/EditSession';
import type { Edit } from '../sandbox/edits';
import type { SimulationState } from '../types/simulation';
import { AssessmentRunner } from './AssessmentRunner';
import type { AssessmentRubric } from './types';

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
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
    ...overrides,
  };
}

function makeRubric(overrides: Partial<AssessmentRubric> = {}): AssessmentRubric {
  return {
    id: 'assessment-1',
    goal: 'Make the backup path work.',
    subgoals: [
      {
        id: 'trace-delivered',
        title: 'Trace delivered',
        required: true,
        predicate: ({ state }) => state.traces.some((trace) => trace.status === 'delivered'),
        hints: [
          { tier: 1, content: 'Look for a delivered trace.' },
          { tier: 2, content: 'Check the alternate route.' },
          { tier: 3, content: 'Send traffic after the link fails.' },
        ],
      },
    ],
    constraints: [],
    ...overrides,
  };
}

const deliveredTrace: SimulationState['traces'][number] = {
  packetId: 'trace-1',
  srcNodeId: 'a',
  dstNodeId: 'b',
  status: 'delivered',
  hops: [],
};

describe('AssessmentRunner', () => {
  it('starts active with one result per subgoal', () => {
    const runner = new AssessmentRunner(makeRubric(), { now: () => 100 });

    expect(runner.status).toEqual({
      status: 'active',
      rubricId: 'assessment-1',
      subgoalResults: [{ subgoalId: 'trace-delivered', passed: false }],
      hintsUsed: [],
      startedAt: 100,
      passedAt: null,
    });
  });

  it('passes when every required subgoal passes', () => {
    const runner = new AssessmentRunner(makeRubric(), { now: () => 250 });

    runner.onSimulationState(makeState({ traces: [deliveredTrace] }), [], EditSession.empty());

    expect(runner.status.status).toBe('passed');
    expect(runner.status.passedAt).toBe(250);
    expect(runner.status.subgoalResults).toEqual([{ subgoalId: 'trace-delivered', passed: true }]);
  });

  it('keeps optional subgoal failures from blocking pass', () => {
    const runner = new AssessmentRunner(
      makeRubric({
        subgoals: [
          {
            id: 'required',
            title: 'Required',
            required: true,
            predicate: () => true,
            hints: [],
          },
          {
            id: 'optional',
            title: 'Optional',
            required: false,
            predicate: () => false,
            hints: [],
          },
        ],
      }),
    );

    runner.onSimulationState(makeState(), [], EditSession.empty());

    expect(runner.status.status).toBe('passed');
    expect(runner.status.subgoalResults).toEqual([
      { subgoalId: 'required', passed: true },
      { subgoalId: 'optional', passed: false },
    ]);
  });

  it('uses a custom pass predicate when provided', () => {
    const runner = new AssessmentRunner(
      makeRubric({
        passPredicate: (results) =>
          results.some((result) => result.subgoalId === 'trace-delivered' && result.passed),
      }),
    );

    runner.onSimulationState(makeState({ traces: [deliveredTrace] }), [], EditSession.empty());

    expect(runner.status.status).toBe('passed');
  });

  it('treats predicate exceptions as failed subgoals', () => {
    const runner = new AssessmentRunner(
      makeRubric({
        subgoals: [
          {
            id: 'throws',
            title: 'Throws',
            required: true,
            predicate: () => {
              throw new Error('boom');
            },
            hints: [],
          },
        ],
      }),
    );

    runner.onSimulationState(makeState(), [], EditSession.empty());

    expect(runner.status.status).toBe('active');
    expect(runner.status.subgoalResults).toEqual([{ subgoalId: 'throws', passed: false }]);
  });

  it('can pass from hook-event evidence', () => {
    const runner = new AssessmentRunner(
      makeRubric({
        subgoals: [
          {
            id: 'event',
            title: 'Event',
            required: true,
            predicate: ({ events }) => events.some((event) => event.name === 'ospf:reconverged'),
            hints: [],
          },
        ],
      }),
    );

    runner.onSimulationState(
      makeState(),
      [{ name: 'ospf:reconverged', payload: null, stepIndex: 4 }],
      EditSession.empty(),
    );

    expect(runner.status.status).toBe('passed');
  });

  it('can pass from edit-session evidence', () => {
    const edit: Edit = { kind: 'noop' };
    const runner = new AssessmentRunner(
      makeRubric({
        subgoals: [
          {
            id: 'edit-session',
            title: 'Edit session',
            required: true,
            predicate: ({ session }) => session.edits.some((entry) => entry.kind === 'noop'),
            hints: [],
          },
        ],
      }),
    );

    runner.onSimulationState(makeState(), [], EditSession.empty().push(edit));

    expect(runner.status.status).toBe('passed');
  });

  it('revokes pass when later state no longer satisfies the rubric', () => {
    let now = 100;
    const runner = new AssessmentRunner(makeRubric(), { now: () => now });

    runner.onSimulationState(makeState({ traces: [deliveredTrace] }), [], EditSession.empty());
    now = 200;
    runner.onSimulationState(makeState({ traces: [] }), [], EditSession.empty());

    expect(runner.status.status).toBe('active');
    expect(runner.status.passedAt).toBe(null);
  });

  it('reveals hint tiers monotonically per subgoal', () => {
    const runner = new AssessmentRunner(makeRubric());

    runner.useHint('trace-delivered');
    runner.useHint('trace-delivered');
    runner.useHint('trace-delivered');
    runner.useHint('trace-delivered');

    expect(runner.status.hintsUsed).toEqual([
      { subgoalId: 'trace-delivered', tier: 1 },
      { subgoalId: 'trace-delivered', tier: 2 },
      { subgoalId: 'trace-delivered', tier: 3 },
    ]);
  });

  it('ignores hint requests for unknown subgoals', () => {
    const runner = new AssessmentRunner(makeRubric());

    runner.useHint('missing');

    expect(runner.status.hintsUsed).toEqual([]);
  });

  it('fails on a step time cap', () => {
    const runner = new AssessmentRunner(makeRubric({ timeCap: { kind: 'step', value: 3 } }));

    runner.onSimulationState(makeState({ currentStep: 3 }), [], EditSession.empty());

    expect(runner.status.status).toBe('failed-timeout');
  });

  it('fails on a wall-clock time cap', () => {
    let now = 100;
    const runner = new AssessmentRunner(makeRubric({ timeCap: { kind: 'wall', value: 50 } }), {
      now: () => now,
    });
    now = 151;

    runner.onSimulationState(makeState(), [], EditSession.empty());

    expect(runner.status.status).toBe('failed-timeout');
  });

  it('can be failed by an external constraint signal', () => {
    const runner = new AssessmentRunner(makeRubric());

    runner.failConstraint();

    expect(runner.status.status).toBe('failed-constraint');
  });

  it('exit prevents later state changes', () => {
    const runner = new AssessmentRunner(makeRubric());

    runner.exit();
    runner.onSimulationState(makeState({ traces: [deliveredTrace] }), [], EditSession.empty());

    expect(runner.status.status).toBe('exited');
    expect(runner.status.subgoalResults).toEqual([{ subgoalId: 'trace-delivered', passed: false }]);
  });

  it('notifies subscribers on status transitions and stops after unsubscribe', () => {
    const runner = new AssessmentRunner(makeRubric());
    const listener = vi.fn();
    const unsubscribe = runner.subscribe(listener);

    runner.onSimulationState(makeState({ traces: [deliveredTrace] }), [], EditSession.empty());
    unsubscribe();
    runner.exit();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ status: 'passed' }));
  });

  it('does not notify subscribers for unchanged evaluations', () => {
    const runner = new AssessmentRunner(makeRubric());
    const listener = vi.fn();
    runner.subscribe(listener);

    runner.onSimulationState(makeState(), [], EditSession.empty());

    expect(listener).not.toHaveBeenCalled();
  });
});
