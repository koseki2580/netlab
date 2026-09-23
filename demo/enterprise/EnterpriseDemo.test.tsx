/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EnterpriseDemo, { stepProgress } from './EnterpriseDemo';

interface MockTrace {
  packetId: string;
  status: 'delivered' | 'dropped' | 'in-flight';
  hops: unknown[];
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
let natTables: unknown[] = [];
let dnsRecord: { address: string } | null = null;
const sendPacket = vi.fn(async (packet: { id: string }) => {
  const trace: MockTrace = { packetId: packet.id, status: 'delivered', hops: [] };
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
    natTables,
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
  natTables = [];
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

function clickButton(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`expected button ${label}`);
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

async function settle() {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
}

describe('EnterpriseDemo step list', () => {
  it('marks steps done, the first unfinished one current, and the rest not yet', () => {
    expect(stepProgress({})).toEqual({
      dhcp: 'current',
      dns: 'todo',
      browse: 'todo',
      acl: 'todo',
    });
    expect(stepProgress({ dhcp: { ok: true, lines: [] }, dns: { ok: false, lines: [] } })).toEqual({
      dhcp: 'done',
      dns: 'current',
      browse: 'todo',
      acl: 'todo',
    });
  });

  it('keeps the NAT rows from step 3 on screen after step 4 runs', async () => {
    runtimeClientIp = '10.0.1.100';
    dnsRecord = { address: '203.0.113.80' };
    natTables = [
      {
        routerId: 'gw-router',
        entries: [
          {
            id: 'n1',
            proto: 'tcp',
            type: 'snat',
            insideLocalIp: '10.0.1.100',
            insideLocalPort: 49152,
            insideGlobalIp: '10.0.2.1',
            insideGlobalPort: 1024,
            outsidePeerIp: '203.0.113.80',
            outsidePeerPort: 80,
            createdAt: 0,
            lastSeenAt: 0,
          },
        ],
      },
    ];
    render();

    await act(async () => {
      clickButton('3. Browse Through NAT');
      await settle();
    });
    await act(async () => {
      clickButton('4. SSH Probe (ACL Deny)');
      await settle();
    });

    const browse = document.querySelector('[data-testid="enterprise-step-browse"]');
    expect(browse?.getAttribute('data-status')).toBe('done');
    expect(
      document.querySelector('[data-testid="enterprise-step-browse-result"]')?.textContent,
    ).toBe('TCP 10.0.1.100:49152 → 10.0.2.1:1024 ↔ 203.0.113.80:80');
    expect(document.querySelector('[data-testid="enterprise-step-acl-result"]')).not.toBeNull();
    // Step 4 appends its probe instead of clearing the run step 3 left.
    expect(engineState.traces.length).toBe(3);
  });

  it('shows no raw highlight-mode value', () => {
    render();
    expect(document.body.textContent).not.toContain('Highlight');
  });
});
