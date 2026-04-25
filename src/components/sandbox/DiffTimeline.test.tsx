/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { fromEngine } from '../../sandbox/SimulationSnapshot';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';
import { DiffTimeline } from './DiffTimeline';

function makeState(trace: PacketTrace): SimulationState {
  return {
    status: 'paused',
    traces: [trace],
    currentTraceId: trace.packetId,
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

function makeHop(step: number, event: PacketHop['event'], nodeId = `n${step}`): PacketHop {
  return {
    step,
    nodeId,
    nodeLabel: nodeId,
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64 - step,
    protocol: 'ICMP',
    event,
    timestamp: step,
  };
}

function makeTrace(hops: PacketHop[]): PacketTrace {
  return {
    packetId: 'trace-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    hops,
    status: 'delivered',
  };
}

function makeRunner(): BranchedSimulationEngine {
  const baselineEngine = new SimulationEngine(directTopology(), new HookEngine());
  baselineEngine.setState(
    makeState(makeTrace([makeHop(0, 'create'), makeHop(1, 'forward'), makeHop(2, 'deliver')])),
  );
  const runner = new BranchedSimulationEngine(fromEngine(baselineEngine), { mode: 'beta' });
  const baseline = runner.baseline;
  if (!baseline) {
    throw new Error('expected beta baseline');
  }
  baseline.setState(
    makeState(makeTrace([makeHop(0, 'create'), makeHop(1, 'forward'), makeHop(2, 'deliver')])),
  );
  runner.whatIf.setState(
    makeState(makeTrace([makeHop(0, 'create'), makeHop(1, 'drop', 'firewall-1')])),
  );
  return runner;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

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

function renderTimeline() {
  const value: SandboxContextValue = {
    mode: 'beta',
    session: EditSession.empty(),
    engine: makeRunner(),
    activeEditor: null,
    diffFilter: 'all',
    pushEdit: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    revertAt: vi.fn(),
    resetAll: vi.fn(),
    switchMode: vi.fn(),
    resetBaseline: vi.fn(),
    openEditPopover: vi.fn(),
    closeEditPopover: vi.fn(),
    setDiffFilter: vi.fn(),
  };

  render(
    <SandboxContext.Provider value={value}>
      <DiffTimeline />
    </SandboxContext.Provider>,
  );
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('DiffTimeline', () => {
  it('renders baseline above what-if rows', () => {
    renderTimeline();

    const rows = Array.from(container?.querySelectorAll('[data-testid="diff-row"]') ?? []);
    expect(rows.map((row) => row.getAttribute('data-branch'))).toEqual(['baseline', 'what-if']);
  });

  it('highlights the first divergent event', () => {
    renderTimeline();

    const divergent = container?.querySelectorAll('[data-divergent="true"]');
    expect(divergent).toHaveLength(2);
    expect(divergent?.[0]?.textContent).toContain('forward');
    expect(divergent?.[1]?.textContent).toContain('drop');
  });

  it('syncs horizontal scroll between rows', () => {
    renderTimeline();
    const rows = Array.from(
      container?.querySelectorAll<HTMLDivElement>('[data-testid="diff-row"]') ?? [],
    );
    const first = rows[0];
    const second = rows[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;

    act(() => {
      first.scrollLeft = 44;
      first.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    expect(second.scrollLeft).toBe(44);
  });

  it('has labelled region semantics', () => {
    renderTimeline();

    const region = container?.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-label')).toBe('Sandbox diff timeline');
  });
});
