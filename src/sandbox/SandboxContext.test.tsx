/* @vitest-environment jsdom */

import { StrictMode, act, Component, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabError } from '../errors';
import { NetlabContext, type NetlabContextValue } from '../components/NetlabContext';
import { HookEngine } from '../hooks/HookEngine';
import { basicArp, scenarioRegistry } from '../scenarios';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { SimulationState } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import type { AssessmentRubric } from '../assessments/types';
import type { SandboxEditProposal } from '../controlled/sandbox-mode';
import type { Edit } from './edits';
import { TutorialProvider } from '../tutorials/TutorialContext';
import { tutorialRegistry } from '../tutorials';
import type { Tutorial } from '../tutorials/types';
import { SandboxIntroProvider } from './intro/SandboxIntroProvider';
import { SandboxProvider, useSandbox, type SandboxContextValue } from './SandboxContext';
import { encodeSandboxEdits } from './urlCodec';

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

function makeTutorial(): Tutorial {
  return {
    id: 'sandbox-conflict',
    scenarioId: 'basic-arp',
    title: 'Conflict',
    summary: 'summary',
    difficulty: 'intro',
    steps: [
      {
        id: 'observe',
        title: 'Observe',
        description: 'Observe',
        predicate: () => false,
      },
    ],
  };
}

const hookEngine = new HookEngine();
const engine = new SimulationEngine(basicArp.topology, hookEngine);

function makeSimulationValue(): SimulationContextValue {
  return {
    engine,
    state: engine.getState(),
    sendPacket: vi.fn(async () => undefined),
    simulateDhcp: vi.fn(async () => false),
    simulateDns: vi.fn(async () => null),
    getDhcpLeaseState: vi.fn(() => null),
    getDnsCache: vi.fn(() => null),
    exportPcap: vi.fn(() => new Uint8Array()),
    animationSpeed: 500,
    setAnimationSpeed: vi.fn(),
    isRecomputing: false,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestSandbox: SandboxContextValue | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

class ErrorBoundary extends Component<
  { readonly children: ReactNode },
  { readonly error: Error | null }
> {
  readonly state: { readonly error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div data-testid="boundary-error">{this.state.error.message}</div>;
    }

    return this.props.children;
  }
}

function CaptureSandbox() {
  latestSandbox = useSandbox();
  return <div data-testid="sandbox-capture">captured</div>;
}

function currentSandbox(): SandboxContextValue {
  if (!latestSandbox) {
    throw new Error('sandbox context was not captured');
  }

  return latestSandbox;
}

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

function renderSandbox(children: ReactNode = <CaptureSandbox />, initialMode?: 'alpha' | 'beta') {
  render(
    <SimulationContext.Provider value={makeSimulationValue()}>
      <SandboxProvider {...(initialMode !== undefined ? { initialMode } : {})}>
        {children}
      </SandboxProvider>
    </SimulationContext.Provider>,
  );
}

function makeAssessmentRubric(constraints: AssessmentRubric['constraints']): AssessmentRubric {
  return {
    id: 'assessment-constraints',
    goal: 'goal',
    subgoals: [
      {
        id: 'goal',
        title: 'Goal',
        required: true,
        predicate: () => true,
        hints: [],
      },
    ],
    constraints,
  };
}

function renderSandboxWithAssessment(
  assessmentRubric: AssessmentRubric,
  testHookEngine = new HookEngine(),
) {
  render(
    <NetlabContext.Provider
      value={{
        topology: basicArp.topology,
        routeTable: basicArp.topology.routeTables,
        areas: [],
        hookEngine: testHookEngine,
      }}
    >
      <SimulationContext.Provider value={makeSimulationValue()}>
        <SandboxProvider assessmentRubric={assessmentRubric}>
          <CaptureSandbox />
        </SandboxProvider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

function renderControlledSandbox({
  topology = basicArp.topology,
  hookEngine: testHookEngine = new HookEngine(),
  sandboxControlMode = 'sandbox-proposes',
  sandboxProposalTimeoutMs = 5000,
  onSandboxEditProposed,
  onTopologyChange,
}: {
  readonly topology?: NetworkTopology;
  readonly hookEngine?: HookEngine;
  readonly sandboxControlMode?: 'sandbox-proposes' | 'sandbox-owns';
  readonly sandboxProposalTimeoutMs?: number;
  readonly onSandboxEditProposed?: (proposal: SandboxEditProposal) => void;
  readonly onTopologyChange?: NetlabContextValue['onTopologyChange'];
}) {
  render(
    <NetlabContext.Provider
      value={{
        topology,
        routeTable: topology.routeTables,
        areas: topology.areas,
        hookEngine: testHookEngine,
        sandboxEnabled: true,
        sandboxControlMode,
        sandboxProposalTimeoutMs,
        ...(onSandboxEditProposed !== undefined ? { onSandboxEditProposed } : {}),
        ...(onTopologyChange !== undefined ? { onTopologyChange } : {}),
      }}
    >
      <SimulationContext.Provider value={makeSimulationValue()}>
        <SandboxProvider>
          <CaptureSandbox />
        </SandboxProvider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

function linkDownEdit(): Edit {
  return {
    kind: 'link.state',
    target: { kind: 'edge', edgeId: 'e1' },
    before: 'up',
    after: 'down',
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestSandbox = null;
  engine.clear();
  window.history.replaceState({}, '', '/');
  tutorialRegistry.clear();
  tutorialRegistry.register(makeTutorial());
  if (!scenarioRegistry.get('basic-arp')) {
    scenarioRegistry.register(basicArp);
  }
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestSandbox = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  tutorialRegistry.clear();
  vi.restoreAllMocks();
});

describe('SandboxProvider', () => {
  it('mounts alone and renders children', () => {
    renderSandbox(<div data-testid="child">sandbox child</div>);

    expect(container?.querySelector('[data-testid="child"]')?.textContent).toBe('sandbox child');
  });

  it('useSandbox returns a live context value inside provider', () => {
    renderSandbox();

    expect(currentSandbox().mode).toBe('alpha');
    expect(currentSandbox().session.size()).toBe(0);
    expect(currentSandbox().engine.whatIf).toBeInstanceOf(SimulationEngine);
  });

  it('pushEdit appends to the immutable session', () => {
    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });

    expect(currentSandbox().session.edits).toEqual([{ kind: 'noop' }]);
  });

  it('proposes controlled sandbox edits and waits for accept before mutating', async () => {
    const proposalRef: { current: SandboxEditProposal | null } = { current: null };
    const onTopologyChange = vi.fn();
    renderControlledSandbox({
      onSandboxEditProposed: (nextProposal) => {
        proposalRef.current = nextProposal;
      },
      onTopologyChange,
    });

    act(() => {
      currentSandbox().pushEdit(linkDownEdit());
    });

    expect(currentSandbox().session.edits).toEqual([]);
    expect(currentSandbox().pendingProposalCount).toBe(1);

    if (!proposalRef.current) {
      throw new Error('expected sandbox proposal');
    }
    const acceptedProposal = proposalRef.current;
    expect(acceptedProposal.edit).toEqual(linkDownEdit());
    await act(async () => {
      acceptedProposal.accept();
      await Promise.resolve();
    });

    expect(currentSandbox().session.edits).toEqual([linkDownEdit()]);
    expect(onTopologyChange).toHaveBeenCalledWith(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ id: 'e1', data: expect.objectContaining({ state: 'down' }) }),
        ]),
      }),
      { source: 'sandbox' },
    );
    expect(currentSandbox().pendingProposalCount).toBe(0);
  });

  it('does not mutate controlled sandbox edits that are rejected by the consumer', async () => {
    const proposalRef: { current: SandboxEditProposal | null } = { current: null };
    const onTopologyChange = vi.fn();
    renderControlledSandbox({
      onSandboxEditProposed: (nextProposal) => {
        proposalRef.current = nextProposal;
      },
      onTopologyChange,
    });

    act(() => {
      currentSandbox().pushEdit(linkDownEdit());
    });

    if (!proposalRef.current) {
      throw new Error('expected sandbox proposal');
    }
    const rejectedProposal = proposalRef.current;
    await act(async () => {
      rejectedProposal.reject('policy');
      await Promise.resolve();
    });

    expect(currentSandbox().session.edits).toEqual([]);
    expect(currentSandbox().engine.snapshot.topology.edges[0]?.data?.state).toBeUndefined();
    expect(onTopologyChange).not.toHaveBeenCalled();
  });

  it('auto-rejects controlled sandbox proposals after timeout', async () => {
    vi.useFakeTimers();
    const testHookEngine = new HookEngine();
    const rejected = vi.fn();
    const timedOut = vi.fn();
    testHookEngine.on('sandbox:edit-rejected', async (payload, next) => {
      rejected(payload);
      await next();
    });
    testHookEngine.on('sandbox:proposal-timeout', async (payload, next) => {
      timedOut(payload);
      await next();
    });
    renderControlledSandbox({
      hookEngine: testHookEngine,
      sandboxProposalTimeoutMs: 5000,
      onSandboxEditProposed: () => undefined,
    });

    act(() => {
      currentSandbox().pushEdit(linkDownEdit());
    });
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(timedOut).toHaveBeenCalledWith({ edit: linkDownEdit() });
    expect(rejected).toHaveBeenCalledWith({
      edit: linkDownEdit(),
      reason: 'controlled-timeout',
    });
    expect(currentSandbox().session.edits).toEqual([]);
    vi.useRealTimers();
  });

  it('rejects proposes mode edits when no proposal callback is registered', async () => {
    const testHookEngine = new HookEngine();
    const rejected = vi.fn();
    testHookEngine.on('sandbox:edit-rejected', async (payload, next) => {
      rejected(payload);
      await next();
    });
    renderControlledSandbox({ hookEngine: testHookEngine });

    await act(async () => {
      currentSandbox().pushEdit(linkDownEdit());
      await Promise.resolve();
    });

    expect(rejected).toHaveBeenCalledWith({
      edit: linkDownEdit(),
      reason: 'controlled-missing-callback',
    });
    expect(currentSandbox().session.edits).toEqual([]);
  });

  it('sandbox-owns applies edits locally and reports informational topology changes', () => {
    const onTopologyChange = vi.fn();
    renderControlledSandbox({
      sandboxControlMode: 'sandbox-owns',
      onTopologyChange,
    });

    act(() => {
      currentSandbox().pushEdit(linkDownEdit());
    });

    expect(currentSandbox().session.edits).toEqual([linkDownEdit()]);
    expect(onTopologyChange).toHaveBeenCalledWith(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ id: 'e1', data: expect.objectContaining({ state: 'down' }) }),
        ]),
      }),
      { source: 'sandbox-informational' },
    );
  });

  it('rejects assessment constraint violations before mutating the session', () => {
    renderSandboxWithAssessment(
      makeAssessmentRubric([{ kind: 'forbid-edit', editKind: 'node.route.add' }]),
    );

    act(() => {
      currentSandbox().pushEdit({
        kind: 'node.route.add',
        target: { kind: 'node', nodeId: 'router-a' },
        route: {
          id: 'route-a',
          prefix: '10.0.0.0/24',
          nextHop: '10.0.0.1',
          outInterface: 'eth0',
          metric: 1,
        },
      });
    });

    expect(currentSandbox().session.edits).toEqual([]);
  });

  it('emits an assessment constraint rejection event with detail', async () => {
    const testHookEngine = new HookEngine();
    const rejected = vi.fn();
    testHookEngine.on('sandbox:edit-rejected', async (payload, next) => {
      rejected(payload);
      await next();
    });
    renderSandboxWithAssessment(
      makeAssessmentRubric([{ kind: 'max-total-edits', max: 1 }]),
      testHookEngine,
    );

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });
    await act(async () => {
      currentSandbox().pushEdit({ kind: 'noop' });
      await Promise.resolve();
    });

    expect(rejected).toHaveBeenCalledWith({
      edit: { kind: 'noop' },
      reason: 'assessment-constraint-violated',
      constraint: { kind: 'max-total-edits', max: 1 },
    });
    expect(currentSandbox().session.edits).toEqual([{ kind: 'noop' }]);
  });

  it('revertToSnapshot moves the head to the snapshot edit index and preserves redo history', () => {
    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().pushEdit({
        kind: 'snapshot.create',
        snapshot: {
          id: 'snapshot-a',
          name: 'Before MTU',
          editIndex: 1,
          sessionIdAtCapture: 'default-session',
          createdAt: -1,
        },
      });
      currentSandbox().pushEdit({
        kind: 'param.set',
        key: 'engine.tickMs',
        before: 100,
        after: 200,
      });
    });

    act(() => {
      currentSandbox().revertToSnapshot('snapshot-a');
    });

    expect(currentSandbox().session.head).toBe(1);
    expect(currentSandbox().session.backing).toHaveLength(3);
    expect(currentSandbox().session.canRedo()).toBe(true);
  });

  it('throws when reverting to an unknown snapshot id', () => {
    renderSandbox();

    expect(() => currentSandbox().revertToSnapshot('missing')).toThrow(NetlabError);
  });

  it('does not trigger React setState warnings when an intro is subscribed during pushEdit', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <StrictMode>
        <SimulationContext.Provider value={makeSimulationValue()}>
          <SandboxProvider>
            <SandboxIntroProvider introId="sandbox-intro-mtu">
              <CaptureSandbox />
            </SandboxIntroProvider>
          </SandboxProvider>
        </SimulationContext.Provider>
      </StrictMode>,
    );

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });

    expect(
      consoleError.mock.calls.some(
        ([message]) => typeof message === 'string' && message.includes('Cannot update a component'),
      ),
    ).toBe(false);
  });

  it('hydrates the initial sandbox session from the sandboxState query param', () => {
    window.history.replaceState(
      {},
      '',
      `/?sandbox=1&sandboxState=${encodeSandboxEdits([
        { kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 },
      ])}`,
    );

    renderSandbox();

    expect(currentSandbox().session.edits).toEqual([
      { kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 },
    ]);
  });

  it('writes sandbox session changes back into the current URL', () => {
    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });

    expect(window.location.search).toContain('sandboxState=');
  });

  it('clears sandboxState from the URL when the baseline is reset', () => {
    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().resetBaseline();
    });

    expect(window.location.search).not.toContain('sandboxState=');
  });

  it('switchMode beta captures a baseline', () => {
    renderSandbox();

    act(() => {
      currentSandbox().switchMode('beta');
    });

    expect(currentSandbox().mode).toBe('beta');
    expect(currentSandbox().engine.baseline).toBeInstanceOf(SimulationEngine);
  });

  it('resetBaseline clears edits and reverts to the initial snapshot', () => {
    engine.setState(makeState({ currentStep: 5 }));
    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().engine.whatIf.setState({
        ...currentSandbox().engine.whatIf.getState(),
        currentStep: 9,
      });
      currentSandbox().resetBaseline();
    });

    expect(currentSandbox().session.size()).toBe(0);
    expect(currentSandbox().engine.whatIf.getState().currentStep).toBe(5);
  });

  it('unmount disposes the branched engine', () => {
    renderSandbox();
    const runner = currentSandbox().engine;

    act(() => {
      root?.unmount();
    });

    expect(runner.whatIf.getState().traces).toEqual([]);
  });

  it('throws when useSandbox is called outside SandboxProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      act(() => {
        render(
          <SimulationContext.Provider value={makeSimulationValue()}>
            <CaptureSandbox />
          </SimulationContext.Provider>,
        );
      }),
    ).toThrow('[netlab] useSandbox must be used within <SandboxProvider>');
  });

  it('mounting under TutorialProvider trips the mutex', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <SimulationContext.Provider value={makeSimulationValue()}>
          <TutorialProvider
            tutorialId="sandbox-conflict"
            engine={engine}
            simulationState={engine.getState()}
            routeTable={basicArp.topology.routeTables}
            hookEngine={hookEngine}
          >
            <SandboxProvider>
              <CaptureSandbox />
            </SandboxProvider>
          </TutorialProvider>
        </SimulationContext.Provider>
      </ErrorBoundary>,
    );

    expect(container?.querySelector('[data-testid="boundary-error"]')?.textContent).toContain(
      'SandboxProvider cannot mount under TutorialProvider',
    );
  });

  it('mutex error is a NetlabError with sandbox/tutorial-conflict code', () => {
    let captured: Error | null = null;

    try {
      render(
        <SimulationContext.Provider value={makeSimulationValue()}>
          <SandboxProvider>
            <CaptureSandbox />
          </SandboxProvider>
        </SimulationContext.Provider>,
      );
    } catch (error) {
      captured = error instanceof Error ? error : new Error(String(error));
    }

    expect(captured).toBeNull();
    expect(
      new NetlabError({
        code: 'sandbox/tutorial-conflict',
        message:
          'SandboxProvider cannot mount under TutorialProvider; see docs/ui/sandbox.md#tutorial-conflict',
      }).code,
    ).toBe('sandbox/tutorial-conflict');
  });
});
