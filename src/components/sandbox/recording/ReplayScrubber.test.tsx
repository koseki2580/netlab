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
import {
  SandboxReplayProvider,
  useReplay,
  type ReplayContextValue,
} from '../../../sandbox/recording/useReplay';
import { shortcutRegistry } from '../../../sandbox/shortcuts/registry';
import { createShortcutDispatcher } from '../../../sandbox/shortcuts/dispatcher';
import {
  RECORDING_SCHEMA_VERSION,
  type RecordedEvent,
  type RecordedSession,
} from '../../../sandbox/recording/types';
import { ReplayScrubber } from './ReplayScrubber';

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

function makeRecording(events: RecordedEvent[]): RecordedSession {
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
let stopDispatcher: (() => void) | null = null;

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

function renderScrubber(events: RecordedEvent[], opts: { withDispatcher?: boolean } = {}) {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(basicArp.topology, hookEngine);
  render(
    <NetlabContext.Provider value={makeNetlabContext(hookEngine)}>
      <SimulationContext.Provider value={makeSimulationValue(engine)}>
        <SandboxProvider enableShortcuts={false}>
          <SandboxReplayProvider recording={makeRecording(events)}>
            <CaptureReplay />
            <ReplayScrubber />
          </SandboxReplayProvider>
        </SandboxProvider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
  if (opts.withDispatcher) {
    stopDispatcher = createShortcutDispatcher();
  }
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  latestReplay = null;
  shortcutRegistry._reset();
  if (!scenarioRegistry.get('basic-arp')) {
    scenarioRegistry.register(basicArp);
  }
});

afterEach(() => {
  stopDispatcher?.();
  stopDispatcher = null;
  act(() => {
    root?.unmount();
  });
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  shortcutRegistry._reset();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

function makeEvents(count: number): RecordedEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    seq: i,
    kind: i % 2 === 0 ? ('edit' as const) : ('mode-changed' as const),
    stepIndex: 0,
    wallDeltaMs: 0,
    payload: i % 2 === 0 ? { edit: { kind: 'noop' } } : { from: 'alpha', to: 'beta' },
    resultingSnapshotId: '',
  }));
}

function dispatchKey(key: string, opts: { shift?: boolean } = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey: opts.shift ?? false,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
}

describe('ReplayScrubber', () => {
  it('renders one tick per event', () => {
    renderScrubber(makeEvents(4));
    for (let i = 0; i < 4; i += 1) {
      expect(container?.querySelector(`[data-testid="replay-tick-${i}"]`)).not.toBeNull();
    }
  });

  it('range input value reflects replay.currentSeq', () => {
    renderScrubber(makeEvents(3));
    const input = container?.querySelector('input[type="range"]') as HTMLInputElement | null;
    expect(input?.value).toBe('-1');
    act(() => {
      latestReplay?.seek(1);
    });
    expect(input?.value).toBe('1');
  });

  it('clicking play toggles to pause and starts the player', () => {
    renderScrubber(makeEvents(3));
    const play = container?.querySelector('button[aria-label="Play replay"]') as HTMLButtonElement;
    expect(play).not.toBeNull();
    act(() => {
      play.click();
    });
    expect(latestReplay?.status).toBe('playing');
    const pause = container?.querySelector(
      'button[aria-label="Pause replay"]',
    ) as HTMLButtonElement;
    expect(pause).not.toBeNull();
  });

  it('range input change calls replay.seek', () => {
    renderScrubber(makeEvents(3));
    const input = container?.querySelector('input[type="range"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    act(() => {
      setter?.call(input, '2');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(latestReplay?.currentSeq).toBe(2);
  });

  it('speed selector updates replay.speed', () => {
    renderScrubber(makeEvents(3));
    const select = container?.querySelector(
      'select[aria-label="Replay speed"]',
    ) as HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      'value',
    )?.set;
    act(() => {
      setter?.call(select, '4');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(latestReplay?.speed).toBe(4);
  });

  it('Fork from here button calls replay.fork and removes scrubber from DOM', () => {
    renderScrubber(makeEvents(3));
    const fork = container?.querySelector(
      'button[aria-label="Fork from here"]',
    ) as HTMLButtonElement;
    act(() => {
      fork.click();
    });
    expect(latestReplay?.isActive).toBe(false);
    expect(container?.querySelector('[data-testid="sandbox-replay-scrubber"]')).toBeNull();
  });

  it('keyboard ArrowRight advances; ArrowLeft retreats (via dispatcher)', () => {
    renderScrubber(makeEvents(3), { withDispatcher: true });
    act(() => {
      dispatchKey('ArrowRight');
    });
    expect(latestReplay?.currentSeq).toBe(0);
    act(() => {
      dispatchKey('ArrowRight');
    });
    expect(latestReplay?.currentSeq).toBe(1);
    act(() => {
      dispatchKey('ArrowLeft');
    });
    expect(latestReplay?.currentSeq).toBe(0);
  });

  it('keyboard Shift+ArrowRight skips to the next edit event', () => {
    // events: 0=edit, 1=mode-changed, 2=edit, 3=mode-changed
    renderScrubber(makeEvents(4), { withDispatcher: true });
    act(() => {
      dispatchKey('ArrowRight'); // seq=0 (edit)
    });
    expect(latestReplay?.currentSeq).toBe(0);
    act(() => {
      dispatchKey('ArrowRight', { shift: true }); // skip to next edit (seq=2)
    });
    expect(latestReplay?.currentSeq).toBe(2);
  });

  it('Home jumps to start, End jumps to last event', () => {
    renderScrubber(makeEvents(4), { withDispatcher: true });
    act(() => {
      dispatchKey('End');
    });
    expect(latestReplay?.currentSeq).toBe(3);
    act(() => {
      dispatchKey('Home');
    });
    expect(latestReplay?.currentSeq).toBe(-1);
  });

  it('Space toggles play/pause', () => {
    renderScrubber(makeEvents(3), { withDispatcher: true });
    act(() => {
      dispatchKey(' ');
    });
    expect(latestReplay?.status).toBe('playing');
    act(() => {
      dispatchKey(' ');
    });
    expect(latestReplay?.status).toBe('paused');
  });

  it('does not render when totalEvents is 0', () => {
    renderScrubber([]);
    expect(container?.querySelector('[data-testid="sandbox-replay-scrubber"]')).toBeNull();
  });

  it('disables stepBackward at start and stepForward at end', () => {
    renderScrubber(makeEvents(2));
    const stepBack = container?.querySelector(
      'button[aria-label="Step backward"]',
    ) as HTMLButtonElement;
    expect(stepBack.disabled).toBe(true);
    act(() => {
      latestReplay?.seek(1);
    });
    const stepFwd = container?.querySelector(
      'button[aria-label="Step forward"]',
    ) as HTMLButtonElement;
    expect(stepFwd.disabled).toBe(true);
  });
});
