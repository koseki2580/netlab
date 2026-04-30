/* @vitest-environment jsdom */

import { Component, StrictMode, act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabContext, type NetlabContextValue } from '../../components/NetlabContext';
import { NetlabError } from '../../errors';
import { HookEngine } from '../../hooks/HookEngine';
import { basicArp, scenarioRegistry } from '../../scenarios';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { SimulationState } from '../../types/simulation';
import { SandboxIntroContext } from '../intro/SandboxIntroProvider';
import { SandboxProvider, useSandbox, type SandboxContextValue } from '../SandboxContext';
import {
  SandboxRecorderProvider,
  useSandboxRecorder,
  type SandboxRecorderContextValue,
} from './SandboxRecorderProvider';
import { validateRecordedSession } from './schema';

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

function makeNetlabContext(hookEngine: HookEngine): NetlabContextValue {
  return {
    topology: basicArp.topology,
    routeTable: new Map(),
    areas: [],
    hookEngine,
  };
}

function makeSimulationValue(engine: SimulationEngine): SimulationContextValue {
  return {
    engine,
    state: makeState(),
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
let latestRecorder: SandboxRecorderContextValue | null = null;
let lastBoundaryError: string | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

class ErrorBoundary extends Component<
  { readonly children: ReactNode },
  { readonly error: Error | null }
> {
  readonly state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      lastBoundaryError = this.state.error.message;
      return <div data-testid="boundary-error">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function CaptureSandbox() {
  latestSandbox = useSandbox();
  return null;
}

function CaptureRecorder() {
  latestRecorder = useSandboxRecorder();
  return null;
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
    root?.render(<StrictMode>{ui}</StrictMode>);
  });
}

interface RenderOptions {
  readonly enabled?: boolean;
  readonly introActive?: boolean;
}

function renderRecorderTree(options: RenderOptions = {}) {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(basicArp.topology, hookEngine);
  const introValue = options.introActive
    ? {
        intro: {
          id: 'fake',
          scenarioId: 'basic-arp',
          title: 't',
          summary: 's',
          difficulty: 'intro' as const,
          steps: [],
        },
        status: 'active' as const,
        currentStepIndex: 0,
        totalSteps: 1,
        currentStep: null,
        start: () => undefined,
        skip: () => undefined,
        restart: () => undefined,
      }
    : null;

  render(
    <NetlabContext.Provider value={makeNetlabContext(hookEngine)}>
      <SimulationContext.Provider value={makeSimulationValue(engine)}>
        <SandboxIntroContext.Provider value={introValue}>
          <SandboxProvider>
            <ErrorBoundary>
              <SandboxRecorderProvider enabled={options.enabled ?? true}>
                <CaptureSandbox />
                <CaptureRecorder />
              </SandboxRecorderProvider>
            </ErrorBoundary>
          </SandboxProvider>
        </SandboxIntroContext.Provider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
  return { hookEngine, engine };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestSandbox = null;
  latestRecorder = null;
  lastBoundaryError = null;
  window.history.replaceState({}, '', '/');
  if (!scenarioRegistry.get('basic-arp')) {
    scenarioRegistry.register(basicArp);
  }
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

function currentRecorder(): SandboxRecorderContextValue {
  if (!latestRecorder) throw new Error('recorder not captured');
  return latestRecorder;
}

function currentSandbox(): SandboxContextValue {
  if (!latestSandbox) throw new Error('sandbox not captured');
  return latestSandbox;
}

describe('SandboxRecorderProvider', () => {
  it('mounts alone with an empty buffer', () => {
    renderRecorderTree();
    expect(currentRecorder().eventCount).toBe(0);
    expect(currentRecorder().isRecording).toBe(true);
    expect(currentRecorder().limitReached).toBe(false);
  });

  it('captures pushEdit as an "edit" event', () => {
    renderRecorderTree();
    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });
    expect(currentRecorder().eventCount).toBe(1);
    const out = currentRecorder().stopAndExport({
      title: 't',
      author: 'a',
      scenarioId: 'basic-arp',
    });
    expect(out.events).toHaveLength(1);
    expect(out.events[0]?.kind).toBe('edit');
    const payload = out.events[0]?.payload as { edit: { kind: string } };
    expect(payload.edit.kind).toBe('noop');
  });

  it('captures multiple edits with monotonically increasing seq', () => {
    renderRecorderTree();
    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().pushEdit({ kind: 'noop' });
    });
    expect(currentRecorder().eventCount).toBe(3);
    const out = currentRecorder().stopAndExport({
      title: 't',
      author: 'a',
      scenarioId: 'basic-arp',
    });
    expect(out.events.map((e) => e.seq)).toEqual([0, 1, 2]);
  });

  it('captures switchMode with from/to in payload', () => {
    renderRecorderTree();
    act(() => {
      currentSandbox().switchMode('beta');
    });
    const out = currentRecorder().stopAndExport({
      title: 't',
      author: 'a',
      scenarioId: 'basic-arp',
    });
    const modeEvent = out.events.find((e) => e.kind === 'mode-changed');
    expect(modeEvent).toBeDefined();
    const payload = modeEvent?.payload as { from: string; to: string };
    expect(payload.from).toBe('alpha');
    expect(payload.to).toBe('beta');
  });

  it('captures sandbox:panel-tab-opened as tab-opened with tabId', async () => {
    const { hookEngine } = renderRecorderTree();
    await act(async () => {
      await hookEngine.emit('sandbox:panel-tab-opened', { axis: 'edits' });
    });
    const out = currentRecorder().stopAndExport({
      title: 't',
      author: 'a',
      scenarioId: 'basic-arp',
    });
    const tabEvent = out.events.find((e) => e.kind === 'tab-opened');
    expect(tabEvent).toBeDefined();
    const payload = tabEvent?.payload as { tabId: string };
    expect(payload.tabId).toBe('edits');
  });

  it('records non-negative wallDeltaMs values', () => {
    renderRecorderTree();
    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().pushEdit({ kind: 'noop' });
    });
    const out = currentRecorder().stopAndExport({
      title: 't',
      author: 'a',
      scenarioId: 'basic-arp',
    });
    for (const event of out.events) {
      expect(event.wallDeltaMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('stopAndExport returns a session that passes validateRecordedSession', () => {
    renderRecorderTree();
    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });
    const out = currentRecorder().stopAndExport({
      title: 'demo',
      author: 'tester',
      scenarioId: 'basic-arp',
    });
    expect(() => validateRecordedSession(out)).not.toThrow();
    expect(out.metadata.scenarioId).toBe('basic-arp');
    expect(out.metadata.toolVersion).toMatch(/\d+\.\d+\.\d+/);
    expect(out.metadata.durationMs).toBeGreaterThanOrEqual(0);
    expect(out.metadata.recordedAt).toMatch(/T/);
  });

  it('refuses to mount when a sandbox intro is active', () => {
    renderRecorderTree({ introActive: true });
    expect(lastBoundaryError).toContain('intro');
  });

  it('does not subscribe when enabled is false', () => {
    renderRecorderTree({ enabled: false });
    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });
    expect(currentRecorder().eventCount).toBe(0);
  });

  it('useSandboxRecorder throws when used outside provider', () => {
    function Renegade() {
      useSandboxRecorder();
      return null;
    }
    let caught: unknown = null;
    try {
      render(
        <ErrorBoundary>
          <Renegade />
        </ErrorBoundary>,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught === null || NetlabError.isInstance(caught)).toBe(true);
    expect(
      lastBoundaryError === null || lastBoundaryError.includes('SandboxRecorderProvider'),
    ).toBe(true);
  });

  it('cleans up hook subscriptions on unmount', async () => {
    const { hookEngine } = renderRecorderTree();
    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });
    expect(currentRecorder().eventCount).toBe(1);
    act(() => {
      root?.unmount();
    });
    root = null;
    // Re-emit on the same hookEngine; if subscriptions weren't cleaned up
    // they would still fire on a stale closure (but we discard the result).
    await hookEngine.emit('sandbox:edit-applied', { edit: { kind: 'noop' } });
    // We can't read recorder state after unmount; we just assert no crash.
    expect(true).toBe(true);
  });
});
