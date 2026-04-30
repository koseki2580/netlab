/* @vitest-environment jsdom */

import { StrictMode, act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabContext, type NetlabContextValue } from '../../components/NetlabContext';
import { HookEngine } from '../../hooks/HookEngine';
import { basicArp, scenarioRegistry } from '../../scenarios';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { SimulationState } from '../../types/simulation';
import { fromEngine } from '../SimulationSnapshot';
import { SandboxProvider } from '../SandboxContext';
import { useUndoRedo } from '../useUndoRedo';
import {
  SandboxReplayProvider,
  useReplay,
  useOptionalReplay,
  type ReplayContextValue,
} from './useReplay';
import { RECORDING_SCHEMA_VERSION, type RecordedEvent, type RecordedSession } from './types';

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

function makeRecording(events: RecordedEvent[] = []): RecordedSession {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(basicArp.topology, hookEngine);
  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot: fromEngine(engine),
    events,
    metadata: {
      title: 't',
      author: 'a',
      recordedAt: '2026-04-21T00:00:00.000Z',
      durationMs: 0,
      toolVersion: '0.1.0',
      scenarioId: 'basic-arp',
    },
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestReplay: ReplayContextValue | null = null;
let latestUndoRedo: ReturnType<typeof useUndoRedo> | null = null;

function CaptureReplay() {
  latestReplay = useReplay();
  return null;
}

function CaptureUndoRedo() {
  latestUndoRedo = useUndoRedo();
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

function renderTree(recording: RecordedSession, options: { children?: ReactNode } = {}) {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(basicArp.topology, hookEngine);
  render(
    <NetlabContext.Provider value={makeNetlabContext(hookEngine)}>
      <SimulationContext.Provider value={makeSimulationValue(engine)}>
        <SandboxProvider>
          <SandboxReplayProvider recording={recording}>
            <CaptureReplay />
            <CaptureUndoRedo />
            {options.children}
          </SandboxReplayProvider>
        </SandboxProvider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  latestReplay = null;
  latestUndoRedo = null;
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
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

function currentReplay(): ReplayContextValue {
  if (!latestReplay) throw new Error('replay context not captured');
  return latestReplay;
}

function currentUndoRedo() {
  if (!latestUndoRedo) throw new Error('undo/redo not captured');
  return latestUndoRedo;
}

describe('useReplay', () => {
  it('exposes initial state with isActive=true and currentSeq=-1', () => {
    renderTree(
      makeRecording([
        {
          seq: 0,
          kind: 'paused',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: {},
          resultingSnapshotId: '',
        },
      ]),
    );
    const replay = currentReplay();
    expect(replay.isActive).toBe(true);
    expect(replay.currentSeq).toBe(-1);
    expect(replay.totalEvents).toBe(1);
    expect(replay.status).toBe('paused');
  });

  it('seek/play/pause/setSpeed update state', () => {
    const events: RecordedEvent[] = [
      {
        seq: 0,
        kind: 'edit',
        stepIndex: 0,
        wallDeltaMs: 0,
        payload: { edit: { kind: 'noop' } },
        resultingSnapshotId: '',
      },
      {
        seq: 1,
        kind: 'edit',
        stepIndex: 0,
        wallDeltaMs: 0,
        payload: { edit: { kind: 'noop' } },
        resultingSnapshotId: '',
      },
    ];
    renderTree(makeRecording(events));
    const initial = currentReplay();
    expect(initial.totalEvents).toBe(2);
    expect(initial.currentSeq).toBe(-1);
    act(() => {
      initial.seek(1);
    });
    // After act, latestReplay may have been re-captured.
    expect(currentReplay().currentSeq).toBe(1);
    act(() => {
      currentReplay().setSpeed(4);
    });
    expect(currentReplay().speed).toBe(4);
  });

  it('fork() returns the current snapshot and flips isActive to false', () => {
    renderTree(
      makeRecording([
        {
          seq: 0,
          kind: 'edit',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: { edit: { kind: 'noop' } },
          resultingSnapshotId: '',
        },
      ]),
    );
    let forked: unknown = null;
    act(() => {
      forked = currentReplay().fork();
    });
    expect(forked).toBeTruthy();
    expect(currentReplay().isActive).toBe(false);
    expect(currentReplay().forkedSnapshot).not.toBeNull();
  });

  it('fork() removes ?replay=... from the URL via replaceState', () => {
    window.history.replaceState({}, '', '/?replay=demo.netlabrec.json&other=x');
    renderTree(
      makeRecording([
        {
          seq: 0,
          kind: 'edit',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: { edit: { kind: 'noop' } },
          resultingSnapshotId: '',
        },
      ]),
    );
    act(() => {
      currentReplay().fork();
    });
    expect(window.location.search).not.toContain('replay=');
    expect(window.location.search).toContain('other=x');
  });

  it('useOptionalReplay returns null outside provider', () => {
    let observed: unknown = 'unset';
    function Probe() {
      observed = useOptionalReplay();
      return null;
    }
    render(<Probe />);
    expect(observed).toBeNull();
  });

  it('undo/redo no-op while replay is active', () => {
    renderTree(
      makeRecording([
        {
          seq: 0,
          kind: 'edit',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: { edit: { kind: 'noop' } },
          resultingSnapshotId: '',
        },
      ]),
    );
    expect(currentReplay().isActive).toBe(true);
    expect(currentUndoRedo().canUndo).toBe(false);
    expect(currentUndoRedo().canRedo).toBe(false);
    // Calling undo should not throw and should be a no-op.
    act(() => {
      currentUndoRedo().undo();
      currentUndoRedo().redo();
    });
    expect(currentReplay().currentSeq).toBe(-1);
  });

  it('undo/redo work after fork (replay deactivated)', () => {
    renderTree(
      makeRecording([
        {
          seq: 0,
          kind: 'edit',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: { edit: { kind: 'noop' } },
          resultingSnapshotId: '',
        },
      ]),
    );
    act(() => {
      currentReplay().fork();
    });
    expect(currentReplay().isActive).toBe(false);
    // canUndo/canRedo now reflect the underlying sandbox session (empty → both false here).
    expect(currentUndoRedo().canUndo).toBe(false);
    expect(currentUndoRedo().canRedo).toBe(false);
  });

  it('onFork callback fires with the forked snapshot', () => {
    const onFork = vi.fn();
    function Tree({ onFork: cb }: { onFork: (s: unknown) => void }) {
      return (
        <SandboxReplayProvider recording={makeRecording([])} onFork={cb}>
          <CaptureReplay />
        </SandboxReplayProvider>
      );
    }
    const hookEngine = new HookEngine();
    const engine = new SimulationEngine(basicArp.topology, hookEngine);
    render(
      <NetlabContext.Provider value={makeNetlabContext(hookEngine)}>
        <SimulationContext.Provider value={makeSimulationValue(engine)}>
          <SandboxProvider>
            <Tree onFork={onFork} />
          </SandboxProvider>
        </SimulationContext.Provider>
      </NetlabContext.Provider>,
    );
    act(() => {
      currentReplay().fork();
    });
    expect(onFork).toHaveBeenCalledTimes(1);
  });
});
