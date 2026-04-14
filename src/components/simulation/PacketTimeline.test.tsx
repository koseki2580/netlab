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
import { PacketTimeline } from './PacketTimeline';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 200, y: 0 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
  areas: [],
  routeTables: new Map(),
};

const TRACE: PacketTrace = {
  packetId: 'pkt-1',
  srcNodeId: 'client-1',
  dstNodeId: 'server-1',
  status: 'delivered',
  hops: [
    {
      step: 0,
      nodeId: 'client-1',
      nodeLabel: 'Client',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      ttl: 64,
      protocol: 'TCP',
      event: 'create',
      toNodeId: 'server-1',
      activeEdgeId: 'e1',
      timestamp: 1,
    },
    {
      step: 1,
      nodeId: 'server-1',
      nodeLabel: 'Server',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      ttl: 64,
      protocol: 'TCP',
      event: 'deliver',
      timestamp: 2,
    },
  ],
};

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    status: 'paused',
    traces: [TRACE],
    currentTraceId: TRACE.packetId,
    currentStep: -1,
    activeEdgeIds: [],
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
    ...overrides,
  };
}

function makeSimulationContextValue(
  overrides: Partial<SimulationContextValue> = {},
): SimulationContextValue {
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
let clickedDownloads: Array<{ download: string; href: string }> = [];
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function render(value: SimulationContextValue) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

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
          <PacketTimeline />
        </SimulationContext.Provider>
      </NetlabContext.Provider>,
    );
  });
}

function getDownloadButton(): HTMLButtonElement {
  const button = Array.from(container?.querySelectorAll('button') ?? []).find(
    (candidate) => candidate.textContent === 'Download PCAP',
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Download PCAP button was not rendered');
  }

  return button;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  clickedDownloads = [];

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:pcap-export'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) {
    clickedDownloads.push({
      download: this.download,
      href: this.href,
    });
  });
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();

  if (typeof originalCreateObjectURL === 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
  }

  if (typeof originalRevokeObjectURL === 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  }

  if (container) {
    container.remove();
    container = null;
  }
});

describe('PacketTimeline', () => {
  it('disables the Download PCAP button when no current trace is selected', () => {
    render(
      makeSimulationContextValue({
        state: makeState({
          traces: [],
          currentTraceId: null,
        }),
      }),
    );

    expect(getDownloadButton().disabled).toBe(true);
  });

  it('exports the current trace to a browser download when clicked', () => {
    const exportPcap = vi.fn(() => new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]));
    render(makeSimulationContextValue({ exportPcap }));

    const button = getDownloadButton();
    expect(button.disabled).toBe(false);

    act(() => {
      button.click();
    });

    expect(exportPcap).toHaveBeenCalledWith('pkt-1');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pcap-export');
    expect(clickedDownloads).toEqual([
      {
        download: 'netlab-trace-pkt-1.pcap',
        href: 'blob:pcap-export',
      },
    ]);
  });
});
