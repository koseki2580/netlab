/* @vitest-environment jsdom */

import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import { DEFAULT_PARAMETERS, type SandboxMode } from '../../sandbox/types';
import {
  AssessmentContext,
  type AssessmentContextValue,
} from '../../assessments/AssessmentProvider';
import { HookEngine } from '../../hooks/HookEngine';
import { NetlabContext, type NetlabContextValue } from '../NetlabContext';
import { EmptySandboxTab } from './EmptySandboxTab';
import { SandboxPanel } from './SandboxPanel';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let clickedDownloads: { download: string; href: string; blob: Blob }[] = [];
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

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

async function waitForDownload() {
  const deadline = Date.now() + 1000;
  while (clickedDownloads.length === 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForElement(selector: string): Promise<Element | null> {
  const deadline = Date.now() + 1000;
  let element: Element | null = null;
  while (!element && Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    element = container?.querySelector(selector) ?? null;
  }
  return element;
}

function makeSandboxValue(overrides: Partial<SandboxContextValue> = {}): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      root: {
        topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },
        snapshotRegistry: [],
        orphanedSnapshotRegistry: [],
        annotations: [],
        parameters: DEFAULT_PARAMETERS,
      },
      snapshot: {
        topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },
        snapshotRegistry: [],
        orphanedSnapshotRegistry: [],
        annotations: [],
        parameters: DEFAULT_PARAMETERS,
      },
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
    pendingProposalCount: 0,
    pushEdit: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    revertAt: vi.fn(),
    revertToSnapshot: vi.fn(),
    resetAll: vi.fn(),
    setSession: vi.fn(),
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

function makeAssessmentValue(): AssessmentContextValue {
  return {
    scenarioId: 'scenario-1',
    rubric: {
      id: 'assessment-1',
      goal: 'Make the assessment pass.',
      subgoals: [
        {
          id: 'goal',
          title: 'Goal',
          required: true,
          predicate: () => false,
          hints: [],
        },
      ],
      constraints: [],
    },
    status: {
      status: 'active',
      rubricId: 'assessment-1',
      subgoalResults: [{ subgoalId: 'goal', passed: false }],
      hintsUsed: [],
      startedAt: 0,
      passedAt: null,
    },
    useHint: vi.fn(),
    exit: vi.fn(),
    failConstraint: vi.fn(),
  };
}

function makeNetlabContext(overrides: Partial<NetlabContextValue> = {}): NetlabContextValue {
  return {
    topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },
    routeTable: new Map(),
    areas: [],
    hookEngine: new HookEngine(),
    sandboxEnabled: true,
    ...overrides,
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  clickedDownloads = [];
  window.history.replaceState({}, '', '/');

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn((blob: Blob) => {
      const href = `blob:sandbox-session-${clickedDownloads.length + 1}`;
      clickedDownloads.push({ download: '', href, blob });
      return href;
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const last = clickedDownloads[clickedDownloads.length - 1];
    if (last) {
      clickedDownloads[clickedDownloads.length - 1] = {
        ...last,
        download: this.download,
        href: this.href,
      };
    }
  });
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

  it('renders five tabs including the edit history count', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    const tabs = Array.from(container?.querySelectorAll('[role="tab"]') ?? []);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Packet',
      'Node',
      'Parameters',
      'Traffic',
      'Edits (0)',
    ]);
  });

  it('renders the assessment tab only when assessment context is present', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <AssessmentContext.Provider value={makeAssessmentValue()}>
          <SandboxPanel />
        </AssessmentContext.Provider>
      </SandboxContext.Provider>,
    );

    const tabs = Array.from(container?.querySelectorAll('[role="tab"]') ?? []);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Packet',
      'Node',
      'Parameters',
      'Traffic',
      'Edits (0)',
      'Assessment',
    ]);
  });

  it('uses sandboxTab=assessment when assessment context is present', async () => {
    window.history.replaceState({}, '', '/?sandboxTab=assessment');

    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <AssessmentContext.Provider value={makeAssessmentValue()}>
          <SandboxPanel />
        </AssessmentContext.Provider>
      </SandboxContext.Provider>,
    );

    expect(container?.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(
      'Assessment',
    );
    expect(container?.textContent).toContain('Make the assessment pass.');
  });

  it('updates the Edits tab count from the active session head', () => {
    const session = EditSession.empty().push({ kind: 'noop' }).push({
      kind: 'param.set',
      key: 'engine.tickMs',
      before: 100,
      after: 200,
    });

    render(
      <SandboxContext.Provider value={makeSandboxValue({ session })}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    expect(container?.querySelector('[role="tab"][data-axis="edits"]')?.textContent).toBe(
      'Edits (2)',
    );
  });

  it('shows pending controlled sandbox proposals', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue({ pendingProposalCount: 2 })}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    expect(container?.textContent).toContain('Pending proposals: 2');
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

  it('uses sandboxTab=edits as the initial active tab', () => {
    window.history.replaceState({}, '', '/?sandboxTab=edits');

    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    expect(container?.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(
      'Edits (0)',
    );
    expect(container?.textContent).toContain('No edits yet');
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
      'Edits (0)',
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

  it('marks compact embed panels and uses the compact width', () => {
    render(
      <NetlabContext.Provider value={makeNetlabContext({ embedMode: 'compact' })}>
        <SandboxContext.Provider value={makeSandboxValue()}>
          <SandboxPanel />
        </SandboxContext.Provider>
      </NetlabContext.Provider>,
    );

    const panel = container?.querySelector<HTMLElement>('[data-testid="sandbox-panel"]');
    expect(panel?.dataset.embedMode).toBe('compact');
    expect(panel?.style.width).toBe('280px');
    expect(container?.querySelector('[aria-label="Collapse sandbox"]')).not.toBeNull();
  });

  it('keeps minimal embed panels open by removing the collapse control', () => {
    render(
      <NetlabContext.Provider value={makeNetlabContext({ embedMode: 'minimal' })}>
        <SandboxContext.Provider value={makeSandboxValue()}>
          <SandboxPanel />
        </SandboxContext.Provider>
      </NetlabContext.Provider>,
    );

    const panel = container?.querySelector<HTMLElement>('[data-testid="sandbox-panel"]');
    expect(panel?.dataset.embedMode).toBe('minimal');
    expect(panel?.style.width).toBe('260px');
    expect(container?.querySelector('[aria-label="Collapse sandbox"]')).toBeNull();
  });

  it('exports the full backing session to a JSON download', async () => {
    window.history.replaceState({}, '', '/?sandbox=1#/networking/mtu-fragmentation');
    const session = EditSession.empty()
      .push({ kind: 'noop' })
      .push({
        kind: 'interface.mtu',
        target: { kind: 'interface', nodeId: 'router-r1', ifaceId: 'tun0' },
        before: 1500,
        after: 500,
      })
      .undo();

    render(
      <SandboxContext.Provider value={makeSandboxValue({ session })}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Export sandbox session"]')?.click();
    });
    await waitForDownload();

    expect(clickedDownloads).toHaveLength(1);
    expect(clickedDownloads[0]?.download).toMatch(/^netlab-sandbox-fragmented-echo-\d{12}\.json$/);
    const json = JSON.parse((await clickedDownloads[0]?.blob.text()) ?? '{}') as {
      schemaVersion?: number;
      scenarioId?: string;
      backing?: unknown[];
      head?: number;
    };
    expect(json.schemaVersion).toBe(2);
    expect(json.scenarioId).toBe('fragmented-echo');
    expect(json.backing).toHaveLength(2);
    expect(json.head).toBe(1);
  });

  it('opens the scenario export authoring dialog from the panel header', async () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Export as scenario"]')?.click();
    });

    expect(await waitForElement('input[aria-label="Scenario id"]')).not.toBeNull();
    expect(
      await waitForElement('button[aria-label="Download scenario TypeScript"]'),
    ).not.toBeNull();
  });

  it('previews and applies an imported JSON session through context replacement', async () => {
    const setSession = vi.fn();
    render(
      <SandboxContext.Provider value={makeSandboxValue({ setSession })}>
        <SandboxPanel />
      </SandboxContext.Provider>,
    );

    const payload = {
      schemaVersion: 1,
      scenarioId: 'fragmented-echo',
      initialParameters: DEFAULT_PARAMETERS,
      backing: [{ kind: 'noop' }],
      head: 1,
      savedAt: '2026-04-21T10:30:00.000Z',
      toolVersion: 'test-version',
    };
    const input = container?.querySelector<HTMLInputElement>(
      'input[aria-label="Import sandbox session file"]',
    );
    const file = new File([JSON.stringify(payload)], 'session.json', {
      type: 'application/json',
    });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container?.textContent).toContain('Import 1 edit from scenario fragmented-echo');

    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Apply imported sandbox session"]')
        ?.click();
    });

    expect(setSession).toHaveBeenCalledWith(new EditSession([{ kind: 'noop' }], 1));
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
