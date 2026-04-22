import { describe, expect, it, vi } from 'vitest';
import type { SimulationState } from '../types/simulation';
import type { Tutorial } from './types';
import { TutorialRunner } from './TutorialRunner';

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

function makeTutorial(overrides: Partial<Tutorial> = {}): Tutorial {
  return {
    id: 'arp-basics',
    scenarioId: 'basic-arp',
    title: 'ARP Basics',
    summary: 'summary',
    difficulty: 'intro',
    steps: [
      {
        id: 'step-1',
        title: 'First',
        description: 'desc',
        predicate: () => false,
      },
    ],
    ...overrides,
  };
}

describe('TutorialRunner', () => {
  it('starts in pending state at step 0', () => {
    const runner = new TutorialRunner(makeTutorial());

    expect(runner.state).toEqual({
      status: 'pending',
      tutorialId: 'arp-basics',
      currentStepIndex: 0,
      stepsCompleted: 0,
    });
  });

  it('start() moves the runner to active', () => {
    const runner = new TutorialRunner(makeTutorial());

    runner.start();

    expect(runner.state.status).toBe('active');
  });

  it('advances to the next step when the current predicate passes on simulation state', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: ({ state }) => state.traces.length >= 1,
          },
          {
            id: 'step-2',
            title: 'Second',
            description: 'desc',
            predicate: () => false,
          },
        ],
      }),
    );

    runner.start();
    runner.onSimulationState(
      makeState({
        traces: [
          { packetId: 't1', hops: [], status: 'delivered', srcNodeId: 'a', dstNodeId: 'b' },
        ] as SimulationState['traces'],
      }),
    );

    expect(runner.state.status).toBe('active');
    expect(runner.state.currentStepIndex).toBe(1);
    expect(runner.state.stepsCompleted).toBe(1);
  });

  it('can advance from hook events alone', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: ({ events }) => events.some((event) => event.name === 'packet:forward'),
          },
        ],
      }),
    );

    runner.start();
    runner.onSimulationState(makeState());
    runner.onHookEvent({ name: 'packet:forward', payload: null, stepIndex: 0 });

    expect(runner.state.status).toBe('passed');
    expect(runner.state.stepsCompleted).toBe(1);
  });

  it('passes the tutorial when the last step succeeds', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: ({ state }) => state.traces.length >= 1,
          },
        ],
      }),
    );

    runner.start();
    runner.onSimulationState(
      makeState({
        traces: [
          { packetId: 't1', hops: [], status: 'delivered', srcNodeId: 'a', dstNodeId: 'b' },
        ] as SimulationState['traces'],
      }),
    );

    expect(runner.state.status).toBe('passed');
    expect(runner.state.currentStepIndex).toBe(1);
  });

  it('fails when maxSteps is exhausted', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: () => false,
            hint: 'Try sending the packet again.',
            maxSteps: 2,
          },
        ],
      }),
    );

    runner.start();
    runner.onSimulationState(makeState());
    runner.onSimulationState(makeState());

    expect(runner.state.status).toBe('failed');
    expect(runner.state.lastHint).toBe('Try sending the packet again.');
  });

  it('treats predicate exceptions as non-passing evaluations', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: () => {
              throw new Error('boom');
            },
            maxSteps: 1,
          },
        ],
      }),
    );

    runner.start();
    runner.onSimulationState(makeState());

    expect(runner.state.status).toBe('failed');
  });

  it('exit() forces exited from pending', () => {
    const runner = new TutorialRunner(makeTutorial());

    runner.exit();

    expect(runner.state.status).toBe('exited');
  });

  it('exit() forces exited from active', () => {
    const runner = new TutorialRunner(makeTutorial());
    runner.start();

    runner.exit();

    expect(runner.state.status).toBe('exited');
  });

  it('ignores further inputs after exit', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: ({ state }) => state.traces.length > 0,
          },
        ],
      }),
    );

    runner.start();
    runner.exit();
    runner.onSimulationState(
      makeState({
        traces: [
          { packetId: 't1', hops: [], status: 'delivered', srcNodeId: 'a', dstNodeId: 'b' },
        ] as SimulationState['traces'],
      }),
    );

    expect(runner.state.status).toBe('exited');
    expect(runner.state.stepsCompleted).toBe(0);
  });

  it('restarts from step 0 after failure', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: () => false,
            maxSteps: 1,
          },
        ],
      }),
    );

    runner.start();
    runner.onSimulationState(makeState());
    runner.start();

    expect(runner.state).toEqual({
      status: 'active',
      tutorialId: 'arp-basics',
      currentStepIndex: 0,
      stepsCompleted: 0,
    });
  });

  it('subscribers are notified on transitions', () => {
    const runner = new TutorialRunner(makeTutorial());
    const listener = vi.fn();

    runner.subscribe(listener);
    runner.start();
    runner.exit();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: 'active', currentStepIndex: 0 }),
    );
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'exited', currentStepIndex: 0 }),
    );
  });

  it('unsubscribe stops future notifications', () => {
    const runner = new TutorialRunner(makeTutorial());
    const listener = vi.fn();

    const unsubscribe = runner.subscribe(listener);
    unsubscribe();
    runner.start();

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not notify for no-op start while already active', () => {
    const runner = new TutorialRunner(makeTutorial());
    const listener = vi.fn();

    runner.subscribe(listener);
    runner.start();
    runner.start();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps only the newest events within the log capacity', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: ({ events }) =>
              events.length === 2 &&
              events[0]?.name === 'packet:deliver' &&
              events[1]?.name === 'packet:drop',
          },
        ],
      }),
      { eventLogCapacity: 2 },
    );

    runner.start();
    runner.onSimulationState(makeState());
    runner.onHookEvent({ name: 'packet:create', payload: null, stepIndex: 0 });
    runner.onHookEvent({ name: 'packet:deliver', payload: null, stepIndex: 1 });
    runner.onHookEvent({ name: 'packet:drop', payload: null, stepIndex: 2 });

    expect(runner.state.status).toBe('passed');
  });

  it('can evaluate immediately on start when state already exists', () => {
    const runner = new TutorialRunner(
      makeTutorial({
        steps: [
          {
            id: 'step-1',
            title: 'First',
            description: 'desc',
            predicate: ({ state }) => state.traces.length === 1,
          },
        ],
      }),
    );

    runner.onSimulationState(
      makeState({
        traces: [
          { packetId: 't1', hops: [], status: 'delivered', srcNodeId: 'a', dstNodeId: 'b' },
        ] as SimulationState['traces'],
      }),
    );
    runner.start();

    expect(runner.state.status).toBe('passed');
  });
});
