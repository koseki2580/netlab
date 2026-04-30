/* @vitest-environment jsdom */

import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabContext, type NetlabContextValue } from '../../../components/NetlabContext';
import { HookEngine } from '../../../hooks/HookEngine';
import { basicArp, scenarioRegistry } from '../../../scenarios';
import {
  SimulationContext,
  type SimulationContextValue,
} from '../../../simulation/SimulationContext';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import type { SimulationState } from '../../../types/simulation';
import { fromEngine } from '../../../sandbox/SimulationSnapshot';
import { SandboxProvider } from '../../../sandbox/SandboxContext';
import { SandboxReplayProvider, useReplay } from '../../../sandbox/recording/useReplay';
import {
  RECORDING_SCHEMA_VERSION,
  type RecordedEvent,
  type RecordedSession,
} from '../../../sandbox/recording/types';
import { DesyncWarning } from './DesyncWarning';

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
let latestReplay: ReturnType<typeof useReplay> | null = null;

function CaptureReplay() {
  latestReplay = useReplay();
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

function makeRecordingWithCorruptedSnapshot(): RecordedSession {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(basicArp.topology, hookEngine);
  const initialSnapshot = fromEngine(engine);
  // Build an "expected" snapshot that is structurally different from what reduceEdit({kind:'noop'}) produces.
  const corruptedSnapshot = {
    ...initialSnapshot,
    state: { ...initialSnapshot.state, currentStep: 9999 },
  } as typeof initialSnapshot;
  const event: RecordedEvent = {
    seq: 0,
    kind: 'edit',
    stepIndex: 0,
    wallDeltaMs: 0,
    payload: { edit: { kind: 'noop' } },
    resultingSnapshotId: 'mismatch',
    resultingSnapshot: corruptedSnapshot,
  };
  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot,
    events: [event],
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

function renderTree(recording: RecordedSession) {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(basicArp.topology, hookEngine);
  render(
    <NetlabContext.Provider value={makeNetlabContext(hookEngine)}>
      <SimulationContext.Provider value={makeSimulationValue(engine)}>
        <SandboxProvider>
          <SandboxReplayProvider recording={recording}>
            <CaptureReplay />
            <DesyncWarning />
          </SandboxReplayProvider>
        </SandboxProvider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  latestReplay = null;
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

describe('DesyncWarning', () => {
  it('renders nothing while replay is in sync', () => {
    renderTree(makeRecordingWithCorruptedSnapshot());
    expect(container?.querySelector('[data-testid="replay-desync-warning"]')).toBeNull();
  });

  it('renders an aria-live alert when desync is detected', () => {
    renderTree(makeRecordingWithCorruptedSnapshot());
    act(() => {
      latestReplay?.seek(0);
    });
    const banner = container?.querySelector('[data-testid="replay-desync-warning"]');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(banner?.getAttribute('aria-live')).toBe('assertive');
    expect(banner?.textContent).toContain('event 0');
  });

  it('Dismiss button hides the warning', () => {
    renderTree(makeRecordingWithCorruptedSnapshot());
    act(() => {
      latestReplay?.seek(0);
    });
    const dismiss = container?.querySelector(
      '[data-testid="replay-desync-warning-dismiss"]',
    ) as HTMLButtonElement;
    act(() => {
      dismiss.click();
    });
    expect(container?.querySelector('[data-testid="replay-desync-warning"]')).toBeNull();
  });

  it('replay player transitions to desynced status on seek with corrupted snapshot', () => {
    renderTree(makeRecordingWithCorruptedSnapshot());
    act(() => {
      latestReplay?.seek(0);
    });
    expect(latestReplay?.status).toBe('desynced');
    expect(latestReplay?.desyncEvent?.seq).toBe(0);
  });

  it('snapshots without resultingSnapshot do not trigger desync', () => {
    const hookEngine = new HookEngine();
    const engine = new SimulationEngine(basicArp.topology, hookEngine);
    const recording: RecordedSession = {
      kind: 'recording',
      schemaVersion: RECORDING_SCHEMA_VERSION,
      initialSnapshot: fromEngine(engine),
      events: [
        {
          seq: 0,
          kind: 'edit',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: { edit: { kind: 'noop' } },
          resultingSnapshotId: '',
        },
      ],
      metadata: {
        title: 't',
        author: 'a',
        recordedAt: '2026-04-21T00:00:00.000Z',
        durationMs: 0,
        toolVersion: '0.1.0',
        scenarioId: 'basic-arp',
      },
    };
    renderTree(recording);
    act(() => {
      latestReplay?.seek(0);
    });
    expect(latestReplay?.status).not.toBe('desynced');
  });

  it('structurally equal recorded snapshot does not desync (id excluded)', () => {
    const hookEngine = new HookEngine();
    const engine = new SimulationEngine(basicArp.topology, hookEngine);
    const initialSnapshot = fromEngine(engine);
    // The recording's resultingSnapshot has a different id but identical structure.
    const equivalentSnapshot = { ...initialSnapshot, id: 'different-id' };
    const recording: RecordedSession = {
      kind: 'recording',
      schemaVersion: RECORDING_SCHEMA_VERSION,
      initialSnapshot,
      events: [
        {
          seq: 0,
          kind: 'edit',
          stepIndex: 0,
          wallDeltaMs: 0,
          payload: { edit: { kind: 'noop' } },
          resultingSnapshotId: 'different-id',
          resultingSnapshot: equivalentSnapshot,
        },
      ],
      metadata: {
        title: 't',
        author: 'a',
        recordedAt: '2026-04-21T00:00:00.000Z',
        durationMs: 0,
        toolVersion: '0.1.0',
        scenarioId: 'basic-arp',
      },
    };
    renderTree(recording);
    act(() => {
      latestReplay?.seek(0);
    });
    expect(latestReplay?.status).not.toBe('desynced');
  });
});
