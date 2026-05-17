/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { NetlabContext } from '../NetlabContext';
import { PacketScrubTimeline } from './PacketScrubTimeline';

const TOPOLOGY: NetworkTopology = {
  nodes: [],
  edges: [],
  areas: [],
  routeTables: new Map(),
};

const TRACE: PacketTrace = {
  packetId: 'pkt-1',
  srcNodeId: 'c1',
  dstNodeId: 's1',
  status: 'delivered',
  hops: [
    {
      step: 0,
      nodeId: 'c1',
      nodeLabel: 'C1',
      srcIp: '10.0.0.1',
      dstIp: '10.0.1.1',
      ttl: 64,
      protocol: 'ICMP',
      event: 'create',
      timestamp: 1,
    },
    {
      step: 1,
      nodeId: 'r1',
      nodeLabel: 'R1',
      srcIp: '10.0.0.1',
      dstIp: '10.0.1.1',
      ttl: 63,
      protocol: 'ICMP',
      event: 'forward',
      timestamp: 2,
    },
    {
      step: 2,
      nodeId: 's1',
      nodeLabel: 'S1',
      srcIp: '10.0.0.1',
      dstIp: '10.0.1.1',
      ttl: 63,
      protocol: 'ICMP',
      event: 'deliver',
      timestamp: 3,
    },
  ],
};

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    status: 'paused',
    traces: [TRACE],
    currentTraceId: TRACE.packetId,
    currentStep: 1,
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

function makeCtx(overrides: Partial<SimulationContextValue> = {}): SimulationContextValue {
  return {
    engine: new SimulationEngine(TOPOLOGY, new HookEngine()),
    state: makeState(),
    sendPacket: async () => {},
    simulateDhcp: async () => false,
    simulateDns: async () => null,
    getDhcpLeaseState: () => null,
    getDnsCache: () => null,
    exportPcap: () => new Uint8Array(),
    animationSpeed: 500,
    setAnimationSpeed: () => {},
    isRecomputing: false,
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(value: SimulationContextValue) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) root = createRoot(container);
  act(() => {
    root?.render(
      <NetlabContext.Provider
        value={{
          topology: TOPOLOGY,
          routeTable: TOPOLOGY.routeTables,
          areas: TOPOLOGY.areas,
          hookEngine: new HookEngine(),
        }}
      >
        <SimulationContext.Provider value={value}>
          <PacketScrubTimeline />
        </SimulationContext.Provider>
      </NetlabContext.Provider>,
    );
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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
});

describe('PacketScrubTimeline', () => {
  it('renders the empty-state placeholder when no trace is loaded', () => {
    render(makeCtx({ state: makeState({ traces: [], currentTraceId: null }) }));
    expect(container?.querySelector('[data-netlab-scrub-empty]')).not.toBeNull();
    expect(container?.querySelector('[data-netlab-scrub-timeline]')).toBeNull();
  });

  it('renders the scrub track with the correct step counter', () => {
    render(makeCtx());
    expect(container?.querySelector('[data-netlab-scrub-timeline]')).not.toBeNull();
    expect(container?.textContent ?? '').toContain('2 / 3');
  });

  it('reports the current step on the role=slider element', () => {
    render(makeCtx());
    const slider = container?.querySelector('[role="slider"]') as HTMLElement | null;
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute('aria-valuenow')).toBe('1');
    expect(slider?.getAttribute('aria-valuemax')).toBe('2');
  });

  it('jumps to the marker step on marker click', () => {
    const selectHop = vi.fn();
    const ctx = makeCtx();
    ctx.engine.selectHop = selectHop;
    ctx.engine.pause = vi.fn();
    render(ctx);
    const markers = container?.querySelectorAll('[data-netlab-scrub-timeline] button');
    expect(markers?.length).toBe(3);
    const lastMarker = markers?.[2] as HTMLButtonElement | undefined;
    act(() => {
      lastMarker?.click();
    });
    expect(selectHop).toHaveBeenCalledWith(2);
  });

  it('toggles play / pause on Space and steps on arrow keys', () => {
    const play = vi.fn();
    const pause = vi.fn();
    const selectHop = vi.fn();
    const ctx = makeCtx();
    ctx.engine.play = play;
    ctx.engine.pause = pause;
    ctx.engine.selectHop = selectHop;
    render(ctx);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });
    expect(play).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(selectHop).toHaveBeenLastCalledWith(2);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(selectHop).toHaveBeenLastCalledWith(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    });
    expect(selectHop).toHaveBeenLastCalledWith(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    });
    expect(selectHop).toHaveBeenLastCalledWith(2);
  });

  it('does not hijack keyboard while an input is focused', () => {
    const play = vi.fn();
    const ctx = makeCtx();
    ctx.engine.play = play;
    render(ctx);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => {
      input.dispatchEvent(
        Object.assign(new KeyboardEvent('keydown', { key: ' ', bubbles: true }), {}),
      );
    });
    input.remove();
    expect(play).not.toHaveBeenCalled();
  });

  it('honors ownKeyboard=false (skips global keydown wiring)', () => {
    const play = vi.fn();
    const ctx = makeCtx();
    ctx.engine.play = play;

    if (!container) {
      container = document.createElement('div');
      document.body.appendChild(container);
    }
    if (!root) root = createRoot(container);
    act(() => {
      root?.render(
        <NetlabContext.Provider
          value={{
            topology: TOPOLOGY,
            routeTable: TOPOLOGY.routeTables,
            areas: TOPOLOGY.areas,
            hookEngine: new HookEngine(),
          }}
        >
          <SimulationContext.Provider value={ctx}>
            <PacketScrubTimeline ownKeyboard={false} />
          </SimulationContext.Provider>
        </NetlabContext.Provider>,
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });
    expect(play).not.toHaveBeenCalled();
  });
});
