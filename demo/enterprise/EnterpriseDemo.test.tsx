/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EnterpriseDemo from './EnterpriseDemo';

interface MockTrace {
  packetId: string;
  status: 'delivered' | 'dropped' | 'in-flight';
}

const engineState: {
  traces: MockTrace[];
  highlightMode: 'path' | 'hop';
} = {
  traces: [],
  highlightMode: 'path',
};

const simulationState: {
  status: 'idle';
  traces: MockTrace[];
  currentTraceId: string | null;
  currentStep: number;
  activeEdgeIds: string[];
  activePathEdgeIds: string[];
  highlightMode: 'path' | 'hop';
  traceColors: Record<string, string>;
  selectedHop: null;
  selectedPacket: null;
  nodeArpTables: Record<string, unknown>;
} = {
  status: 'idle' as const,
  traces: engineState.traces,
  currentTraceId: null,
  currentStep: -1,
  activeEdgeIds: [],
  activePathEdgeIds: [],
  highlightMode: 'path' as const,
  traceColors: {},
  selectedHop: null,
  selectedPacket: null,
  nodeArpTables: {},
};

let runtimeClientIp: string | null = null;
let dnsRecord: { address: string } | null = null;
const sendPacket = vi.fn(async (packet: { id: string }) => {
  const trace: MockTrace = { packetId: packet.id, status: 'delivered' };
  engineState.traces.push(trace);
  simulationState.traces = engineState.traces as typeof simulationState.traces;
  simulationState.currentTraceId = packet.id;
});
const simulateDhcp = vi.fn(async () => true);
const simulateDns = vi.fn(async () => dnsRecord?.address ?? null);
const mockEngine = {
  clear: vi.fn(() => {
    engineState.traces.length = 0;
    simulationState.traces = engineState.traces as typeof simulationState.traces;
    simulationState.currentTraceId = null;
  }),
  clearTraces: vi.fn(() => {
    engineState.traces.length = 0;
    simulationState.traces = engineState.traces as typeof simulationState.traces;
    simulationState.currentTraceId = null;
  }),
  getRuntimeNodeIp: vi.fn(() => runtimeClientIp),
  getState: vi.fn(() => ({
    ...simulationState,
    traces: engineState.traces,
    highlightMode: engineState.highlightMode,
  })),
};

vi.mock('../DemoShell', () => ({
  default: ({
    title,
    desc,
    children,
  }: {
    title: string;
    desc: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="shell" data-title={title} data-desc={desc}>
      {children}
    </div>
  ),
}));

vi.mock('../../src/components/NetlabProvider', () => ({
  NetlabProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/components/NetlabCanvas', () => ({
  NetlabCanvas: ({ nodeDetailsEditable }: { nodeDetailsEditable?: boolean }) => (
    <div data-testid="canvas" data-editable={String(Boolean(nodeDetailsEditable))} />
  ),
}));

vi.mock('../../src/components/ResizableSidebar', () => ({
  ResizableSidebar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar">{children}</div>
  ),
}));

vi.mock('../../src/components/simulation/HopInspector', () => ({
  HopInspector: () => <div data-testid="hop-inspector" />,
}));

vi.mock('../../src/components/simulation/NatTableViewer', () => ({
  NatTableViewer: () => <div data-testid="nat-table" />,
}));

vi.mock('../../src/components/simulation/PacketTimeline', () => ({
  PacketTimeline: () => <div data-testid="packet-timeline" />,
}));

vi.mock('../../src/components/simulation/SimulationControls', () => ({
  SimulationControls: () => <div data-testid="simulation-controls" />,
}));

vi.mock('../../src/simulation/SimulationContext', () => ({
  SimulationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSimulation: () => ({
    engine: mockEngine,
    state: {
      ...simulationState,
      traces: engineState.traces,
      highlightMode: engineState.highlightMode,
    },
    sendPacket,
    simulateDhcp,
    simulateDns,
    getDnsCache: () =>
      dnsRecord
        ? { 'www.example.com': { address: dnsRecord.address, ttl: 300, resolvedAt: 0 } }
        : null,
  }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render() {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(<EnterpriseDemo />);
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  runtimeClientIp = null;
  dnsRecord = null;
  engineState.traces.length = 0;
  engineState.highlightMode = 'path';
  simulationState.traces = engineState.traces as typeof simulationState.traces;
  simulationState.currentTraceId = null;
  vi.clearAllMocks();
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
});

describe('EnterpriseDemo', () => {
  it('renders the enterprise controls and enables inline canvas editing', () => {
    render();

    const canvas = document.querySelector('[data-testid="canvas"]');
    expect(canvas?.getAttribute('data-editable')).toBe('true');
    expect(document.body.textContent).toContain('1. DHCP Boot');
    expect(document.body.textContent).toContain('3. Browse Through NAT');
    expect(document.body.textContent).toContain('4. SSH Probe (ACL Deny)');
    expect(document.querySelector('[data-testid="shell"]')?.getAttribute('data-title')).toBe(
      'Enterprise Edge',
    );
  });

  it('disables DNS and browse actions until DHCP and DNS state exist', () => {
    render();

    const buttons = Array.from(document.querySelectorAll('button'));
    const dnsButton = buttons.find((button) => button.textContent?.includes('Resolve DNS'));
    const browseButton = buttons.find((button) =>
      button.textContent?.includes('Browse Through NAT'),
    );

    expect(dnsButton?.hasAttribute('disabled')).toBe(true);
    expect(browseButton?.hasAttribute('disabled')).toBe(true);
  });

  it('runs the full scenario by chaining DHCP, DNS, and request/response packets', async () => {
    runtimeClientIp = '10.0.1.100';
    dnsRecord = { address: '203.0.113.80' };
    render();

    const fullScenarioButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Run Full Scenario'),
    );
    if (!fullScenarioButton) {
      throw new Error('expected full scenario button');
    }

    await act(async () => {
      fullScenarioButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockEngine.clear).toHaveBeenCalledTimes(1);
    expect(simulateDhcp).toHaveBeenCalledWith('client-a');
    expect(simulateDns).toHaveBeenCalledWith('client-a', 'www.example.com');
    expect(sendPacket).toHaveBeenCalledTimes(2);
    expect(engineState.traces).toHaveLength(2);
  });
});
