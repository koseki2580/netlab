/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AllInOneDemo from './comprehensive/AllInOneDemo';
import MtuFragmentationDemo from './networking/MtuFragmentationDemo';
import OspfConvergenceDemo from './routing/OspfConvergenceDemo';
import TcpHandshakeDemo from './simulation/TcpHandshakeDemo';

const netlabProviderCalls: {
  sandboxEnabled: boolean | undefined;
  sandboxIntroId: string | undefined;
}[] = [];

vi.mock('./DemoShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock('../src/components/NetlabProvider', () => ({
  NetlabProvider: ({
    children,
    sandboxEnabled,
    sandboxIntroId,
  }: {
    children: React.ReactNode;
    sandboxEnabled?: boolean;
    sandboxIntroId?: string;
  }) => {
    netlabProviderCalls.push({ sandboxEnabled, sandboxIntroId });

    return (
      <div
        data-testid="netlab-provider"
        data-sandbox-enabled={String(Boolean(sandboxEnabled))}
        data-sandbox-intro-id={sandboxIntroId ?? ''}
      >
        {children}
      </div>
    );
  },
}));

vi.mock('../src/components/NetlabCanvas', () => ({
  NetlabCanvas: () => <div data-testid="canvas" />,
}));

vi.mock('../src/components/sandbox', () => ({
  SandboxIntroOverlay: () => <div data-testid="sandbox-intro-overlay" />,
}));

vi.mock('../src/sandbox/intro/SandboxIntroProvider', () => ({
  SandboxIntroProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/components/ResizableSidebar', () => ({
  ResizableSidebar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar">{children}</div>
  ),
}));

vi.mock('../src/components/simulation/HopInspector', () => ({
  HopInspector: () => <div data-testid="hop-inspector" />,
}));

vi.mock('../src/components/simulation/PacketTimeline', () => ({
  PacketTimeline: () => <div data-testid="packet-timeline" />,
}));

vi.mock('../src/components/simulation/TraceSummary', () => ({
  TraceSummary: () => <div data-testid="trace-summary" />,
}));

vi.mock('../src/components/simulation/PacketStructureViewer', () => ({
  PacketStructureViewer: () => <div data-testid="packet-structure-viewer" />,
}));

vi.mock('../src/components/simulation/StepControls', () => ({
  StepControls: () => <div data-testid="step-controls" />,
}));

vi.mock('../src/components/simulation/SimulationOverlayDock', () => ({
  SimulationOverlayDock: () => <div data-testid="simulation-overlay-dock" />,
}));

vi.mock('../src/components/simulation/SimulationControls', () => ({
  SimulationControls: () => <div data-testid="simulation-controls" />,
}));

vi.mock('../src/components/simulation/FailureTogglePanel', () => ({
  FailureTogglePanel: () => <div data-testid="failure-toggle-panel" />,
}));

vi.mock('../src/editor/components/TopologyEditor', () => ({
  TopologyEditor: () => <div data-testid="topology-editor" />,
}));

vi.mock('../src/components/NetlabContext', () => ({
  useNetlabContext: () => ({
    topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },
    routeTable: new Map(),
    areas: [],
    hookEngine: {},
  }),
}));

vi.mock('../src/simulation/SimulationContext', () => ({
  SimulationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSimulation: () => ({
    engine: {
      reset: vi.fn(),
      clear: vi.fn(),
      clearTraces: vi.fn(),
      ping: vi.fn(async () => undefined),
      getTcpConnections: vi.fn(() => []),
      getState: vi.fn(() => ({
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
      })),
    },
    sendPacket: vi.fn(async () => undefined),
    state: {
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
    },
    isRecomputing: false,
  }),
}));

vi.mock('../src/simulation/FailureContext', () => ({
  FailureProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFailure: () => ({
    failureState: {
      downNodeIds: new Set<string>(),
      downEdgeIds: new Set<string>(),
      downInterfaceIds: new Set<string>(),
    },
  }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;
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

describe('sandbox-enabled demos', () => {
  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    netlabProviderCalls.length = 0;
    window.history.replaceState({}, '', '/');
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

    vi.clearAllMocks();
  });

  it.each([
    ['MTU fragmentation', MtuFragmentationDemo],
    ['TCP handshake', TcpHandshakeDemo],
    ['OSPF convergence', OspfConvergenceDemo],
  ])(
    'passes sandboxEnabled through NetlabProvider when sandbox mode is requested for %s',
    (_, Demo) => {
      window.history.replaceState({}, '', '/?sandbox=1');

      render(<Demo />);

      expect(netlabProviderCalls[0]?.sandboxEnabled).toBe(true);
      expect(
        document
          .querySelector('[data-testid="netlab-provider"]')
          ?.getAttribute('data-sandbox-enabled'),
      ).toBe('true');
    },
  );

  it('opens the all-in-one demo on a sandbox-enabled simulation surface when sandbox mode is requested', () => {
    window.history.replaceState({}, '', '/?sandbox=1');

    render(<AllInOneDemo />);

    expect(document.querySelectorAll('[data-testid="netlab-provider"]').length).toBeGreaterThan(0);
    expect(
      Array.from(document.querySelectorAll('[data-testid="netlab-provider"]')).some(
        (node) => node.getAttribute('data-sandbox-enabled') === 'true',
      ),
    ).toBe(true);
  });

  it('keeps sandbox mode enabled when the intro query parameter is present', () => {
    window.history.replaceState({}, '', '/?sandbox=1&intro=sandbox-intro-mtu');

    render(<MtuFragmentationDemo />);

    expect(netlabProviderCalls[0]?.sandboxEnabled).toBe(true);
    expect(netlabProviderCalls[0]?.sandboxIntroId).toBe('sandbox-intro-mtu');
  });
});
