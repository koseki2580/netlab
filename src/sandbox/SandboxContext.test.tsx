/* @vitest-environment jsdom */

import { StrictMode, act, Component, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabError } from '../errors';
import { HookEngine } from '../hooks/HookEngine';
import { basicArp, scenarioRegistry } from '../scenarios';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { SimulationState } from '../types/simulation';
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
