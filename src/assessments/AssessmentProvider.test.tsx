/**
 * @vitest-environment jsdom
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabContext } from '../components/NetlabContext';
import { NetlabProvider } from '../components/NetlabProvider';
import { HookEngine } from '../hooks/HookEngine';
import { scenarioRegistry } from '../scenarios/ScenarioRegistry';
import { EditSession } from '../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../sandbox/SandboxContext';
import { TutorialPresenceContext } from '../tutorials/TutorialContext';
import type { SimulationState } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import type { AssessmentRubric, AssessmentStatus } from './types';
import { AssessmentProvider } from './AssessmentProvider';
import { useAssessment } from './useAssessment';

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

function makeTopology(): NetworkTopology {
  return { nodes: [], edges: [], areas: [], routeTables: new Map() };
}

function makeRubric(overrides: Partial<AssessmentRubric> = {}): AssessmentRubric {
  return {
    id: `rubric-${Math.random()}`,
    goal: 'Pass the assessment.',
    subgoals: [
      {
        id: 'event',
        title: 'Event',
        required: true,
        predicate: ({ events }) => events.some((event) => event.name === 'sandbox:edit-applied'),
        hints: [{ tier: 1, content: 'Use the sandbox.' }],
      },
    ],
    constraints: [],
    ...overrides,
  };
}

function registerScenario(rubric: AssessmentRubric): string {
  const id = `assessment-scenario-${Math.random()}`;
  scenarioRegistry.register({
    metadata: {
      id,
      title: 'Assessment',
      summary: 'summary',
      objective: 'objective',
      difficulty: 'core',
      protocols: [],
      prerequisiteIds: [],
    },
    topology: makeTopology(),
    assessmentRubric: rubric,
  });
  return id;
}

function makeSandboxValue(state = makeState()): SandboxContextValue {
  const listeners = new Set<() => void>();
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      whatIf: { getState: () => state },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    } as unknown as SandboxContextValue['engine'],
    activeEditor: null,
    diffFilter: 'all',
    pushEdit: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    revertAt: vi.fn(),
    revertToSnapshot: vi.fn(),
    resetAll: vi.fn(),
    setSession: vi.fn(),
    switchMode: vi.fn(),
    resetBaseline: vi.fn(),
    openEditPopover: vi.fn(),
    closeEditPopover: vi.fn(),
    setDiffFilter: vi.fn(),
  };
}

function renderWithProviders(
  ui: React.ReactNode,
  {
    hookEngine = new HookEngine(),
    sandbox = makeSandboxValue(),
  }: { hookEngine?: HookEngine; sandbox?: SandboxContextValue } = {},
): { root: Root; container: HTMLDivElement; hookEngine: HookEngine } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <NetlabContext.Provider
        value={{
          topology: makeTopology(),
          routeTable: new Map(),
          areas: [],
          hookEngine,
        }}
      >
        <SandboxContext.Provider value={sandbox}>{ui}</SandboxContext.Provider>
      </NetlabContext.Provider>,
    );
  });

  return { root, container, hookEngine };
}

function StatusProbe({ onStatus }: { readonly onStatus: (status: AssessmentStatus) => void }) {
  const assessment = useAssessment();
  onStatus(assessment.status);
  return <button onClick={() => assessment.useHint('event')}>hint</button>;
}

function ActionProbe({ onStatus }: { readonly onStatus: (status: AssessmentStatus) => void }) {
  const assessment = useAssessment();
  onStatus(assessment.status);
  return (
    <>
      <button onClick={() => assessment.exit()}>exit</button>
      <button onClick={() => assessment.failConstraint()}>constraint</button>
    </>
  );
}

describe('AssessmentProvider', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('useAssessment throws outside the provider', () => {
    function Probe() {
      useAssessment();
      return null;
    }

    expect(() => renderWithProviders(<Probe />)).toThrow(/useAssessment/);
  });

  it('exposes initial assessment status from a scenario rubric', () => {
    const scenarioId = registerScenario(makeRubric());
    const onStatus = vi.fn();

    renderWithProviders(
      <AssessmentProvider assessmentScenarioId={scenarioId}>
        <StatusProbe onStatus={onStatus} />
      </AssessmentProvider>,
    );

    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'active' }));
  });

  it('reveals hints through the context action', () => {
    const scenarioId = registerScenario(makeRubric());
    const onStatus = vi.fn();
    const { container } = renderWithProviders(
      <AssessmentProvider assessmentScenarioId={scenarioId}>
        <StatusProbe onStatus={onStatus} />
      </AssessmentProvider>,
    );

    act(() => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({ hintsUsed: [{ subgoalId: 'event', tier: 1 }] }),
    );
  });

  it('re-evaluates the rubric from subscribed hook events', async () => {
    const hookEngine = new HookEngine();
    const scenarioId = registerScenario(makeRubric());
    const onStatus = vi.fn();
    renderWithProviders(
      <AssessmentProvider assessmentScenarioId={scenarioId}>
        <StatusProbe onStatus={onStatus} />
      </AssessmentProvider>,
      { hookEngine },
    );

    await act(async () => {
      await hookEngine.emit('sandbox:edit-applied', { edit: { kind: 'noop' } });
    });

    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'passed' }));
  });

  it('throws for scenarios without an assessment rubric', () => {
    const scenarioId = `plain-scenario-${Math.random()}`;
    scenarioRegistry.register({
      metadata: {
        id: scenarioId,
        title: 'Plain',
        summary: 'summary',
        objective: 'objective',
        difficulty: 'intro',
        protocols: [],
        prerequisiteIds: [],
      },
      topology: makeTopology(),
    });

    expect(() =>
      renderWithProviders(
        <AssessmentProvider assessmentScenarioId={scenarioId}>
          <div />
        </AssessmentProvider>,
      ),
    ).toThrow(/assessment rubric/);
  });

  it('throws for an unknown assessment scenario id', () => {
    expect(() =>
      renderWithProviders(
        <AssessmentProvider assessmentScenarioId="missing-assessment-scenario">
          <div />
        </AssessmentProvider>,
      ),
    ).toThrow(/unknown assessment scenario/);
  });

  it('does not mark TutorialPresenceContext as present', () => {
    const scenarioId = registerScenario(makeRubric());
    const onPresence = vi.fn();
    function PresenceProbe() {
      onPresence(React.useContext(TutorialPresenceContext));
      return null;
    }

    renderWithProviders(
      <AssessmentProvider assessmentScenarioId={scenarioId}>
        <PresenceProbe />
      </AssessmentProvider>,
    );

    expect(onPresence).toHaveBeenLastCalledWith(false);
  });

  it('fails when a constraint rejection hook event is observed', async () => {
    const hookEngine = new HookEngine();
    const scenarioId = registerScenario(makeRubric());
    const onStatus = vi.fn();
    renderWithProviders(
      <AssessmentProvider assessmentScenarioId={scenarioId}>
        <StatusProbe onStatus={onStatus} />
      </AssessmentProvider>,
      { hookEngine },
    );

    await act(async () => {
      await hookEngine.emit('sandbox:edit-rejected', {
        edit: { kind: 'noop' },
        reason: 'assessment-constraint-violated',
      } as never);
    });

    expect(onStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed-constraint' }),
    );
  });

  it('exposes exit and explicit constraint actions through the context', () => {
    const scenarioId = registerScenario(makeRubric());
    const onStatus = vi.fn();
    const { container } = renderWithProviders(
      <AssessmentProvider assessmentScenarioId={scenarioId}>
        <ActionProbe onStatus={onStatus} />
      </AssessmentProvider>,
    );

    act(() => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'exited' }));
  });

  it('NetlabProvider publishes assessmentScenarioId and enables sandbox automatically', () => {
    const onValue = vi.fn();
    function Probe() {
      const value = React.useContext(NetlabContext);
      onValue(value);
      return null;
    }

    renderWithProviders(
      <NetlabProvider topology={makeTopology()} assessmentScenarioId="assessment-scenario">
        <Probe />
      </NetlabProvider>,
    );

    expect(onValue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assessmentScenarioId: 'assessment-scenario',
        sandboxEnabled: true,
      }),
    );
  });
});
