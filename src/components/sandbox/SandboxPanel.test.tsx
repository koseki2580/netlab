/* @vitest-environment jsdom */

import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import { DEFAULT_PARAMETERS, type SandboxMode } from '../../sandbox/types';
import { EmptySandboxTab } from './EmptySandboxTab';
import { SandboxPanel } from './SandboxPanel';

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

function makeSandboxValue(overrides: Partial<SandboxContextValue> = {}): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      whatIf: {
        getState: () => ({
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
        }),
        getTopology: () => ({ nodes: [], edges: [], areas: [], routeTables: new Map() }),
      },
      parameters: DEFAULT_PARAMETERS,
    } as unknown as BranchedSimulationEngine,
    activeEditor: null,
    diffFilter: 'all',
    pushEdit: vi.fn(),
    switchMode: vi.fn(),
    resetBaseline: vi.fn(),
    openEditPopover: vi.fn(),
    closeEditPopover: vi.fn(),
    setDiffFilter: vi.fn(),
    ...overrides,
  };
}

function StatefulSandbox({ children }: { readonly children: ReactNode }) {
  const [mode, setMode] = useState<SandboxMode>('alpha');
  const value = makeSandboxValue({
    mode,
    switchMode: (nextMode) => setMode(nextMode),
  });

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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

  vi.restoreAllMocks();
});

describe('SandboxPanel', () => {
  it('renders a labelled region with the Sandbox heading', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    const region = container?.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-labelledby')).toBe('sandbox-panel-heading');
    expect(container?.querySelector('#sandbox-panel-heading')?.textContent).toBe('Sandbox');
  });

  it('renders four tabs', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    const tabs = Array.from(container?.querySelectorAll('[role="tab"]') ?? []);
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Packet', 'Node', 'Parameters', 'Traffic']);
  });

  it('shows the packet empty state by default', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    expect(container?.textContent).toContain('Select or generate a packet trace');
  });

  it('shows node edit summary when selecting Node', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );
    const nodeTab = container?.querySelector<HTMLButtonElement>('[role="tab"][data-axis="node"]');

    act(() => {
      nodeTab?.click();
    });

    expect(container?.textContent).toContain('Right-click a node or link');
    expect(container?.textContent).toContain('Routes0');
  });

  it('uses the sandboxTab query parameter as the initial active tab', () => {
    window.history.replaceState({}, '', '/?sandboxTab=node');

    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    expect(container?.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(
      'Node',
    );
    expect(container?.textContent).toContain('Right-click a node or link');
  });

  it('supports ArrowRight keyboard navigation between tabs', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );
    const packetTab = container?.querySelector<HTMLButtonElement>(
      '[role="tab"][data-axis="packet"]',
    );

    act(() => {
      packetTab?.focus();
      packetTab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(container?.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(
      'Node',
    );
  });

  it('supports ArrowLeft keyboard navigation between tabs', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );
    const packetTab = container?.querySelector<HTMLButtonElement>(
      '[role="tab"][data-axis="packet"]',
    );

    act(() => {
      packetTab?.focus();
      packetTab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });

    expect(container?.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(
      'Traffic',
    );
  });

  it('mode toggle switches between Live and Compare through context', () => {
    render(
      <StatefulSandbox>
        <SandboxPanel />
      </StatefulSandbox>,
    );
    const toggle = container?.querySelector<HTMLButtonElement>(
      '[aria-label="Switch sandbox mode"]',
    );

    expect(toggle?.textContent).toContain('Live');

    act(() => {
      toggle?.click();
    });

    expect(toggle?.textContent).toContain('Compare');
  });

  it('collapse button hides and restores the panel for this mount', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );
    const collapse = container?.querySelector<HTMLButtonElement>('[aria-label="Collapse sandbox"]');

    act(() => {
      collapse?.click();
    });

    expect(container?.querySelector('[role="region"]')).toBeNull();

    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Open sandbox"]')?.click();
    });

    expect(container?.querySelector('[role="region"]')).not.toBeNull();
  });
});

describe('EmptySandboxTab', () => {
  it('links to the sandbox documentation', () => {
    render(<EmptySandboxTab axis="traffic" />);

    const link = container?.querySelector<HTMLAnchorElement>('a');
    expect(link?.getAttribute('href')).toBe('docs/ui/sandbox.md');
    expect(container?.textContent).toContain('plan/60');
  });
});
