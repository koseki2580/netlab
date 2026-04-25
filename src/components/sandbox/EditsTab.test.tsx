/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import type { Edit } from '../../sandbox/edits';
import { EditsTab } from './EditsTab';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const mtuEdit: Edit = {
  kind: 'interface.mtu',
  target: { kind: 'interface', nodeId: 'router-1', ifaceId: 'eth0' },
  before: 1500,
  after: 900,
};

const paramEdit: Edit = {
  kind: 'param.set',
  key: 'engine.tickMs',
  before: 100,
  after: 200,
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
    undo: vi.fn(),
    redo: vi.fn(),
    revertAt: vi.fn(),
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

function renderEditsTab(value: SandboxContextValue) {
  render(
    <SandboxContext.Provider value={value}>
      <EditsTab />
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

describe('EditsTab', () => {
  it('renders an empty state when there is no history', () => {
    renderEditsTab(makeSandboxValue());

    expect(container?.textContent).toContain('No edits yet');
    expect(container?.querySelector('ol')).toBeNull();
  });

  it('renders one row for every backing history entry', () => {
    const session = EditSession.empty().push(mtuEdit).push(paramEdit).undo();

    renderEditsTab(makeSandboxValue({ session }));

    const rows = Array.from(container?.querySelectorAll('[data-testid="edit-list-item"]') ?? []);
    expect(rows).toHaveLength(2);
    expect(container?.textContent).toContain('interface.mtu');
    expect(container?.textContent).toContain('param.set');
  });

  it('calls context.revertAt when a visible row is reverted', () => {
    const revertAt = vi.fn();
    const session = EditSession.empty().push(mtuEdit).push(paramEdit);
    renderEditsTab(makeSandboxValue({ session, revertAt }));

    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Revert edit 2"]')?.click();
    });

    expect(revertAt).toHaveBeenCalledWith(1);
  });

  it('walks undo through context.undo for Undo to here', () => {
    const undo = vi.fn();
    const session = EditSession.empty().push(mtuEdit).push(paramEdit);
    renderEditsTab(makeSandboxValue({ session, undo }));

    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Undo to edit 2"]')?.click();
    });

    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('marks redo-tail rows and disables active-only controls for them', () => {
    const session = EditSession.empty().push(mtuEdit).push(paramEdit).undo();
    renderEditsTab(makeSandboxValue({ session }));

    const rows = Array.from(
      container?.querySelectorAll<HTMLElement>('[data-testid="edit-list-item"]') ?? [],
    );
    expect(rows[1]?.dataset.historyState).toBe('redo');
    expect(rows[1]?.textContent).toContain('Redo');
    expect(rows[1]?.querySelector('[aria-label="Revert edit 2"]')).toBeNull();
  });

  it('confirms and calls resetAll from the header', () => {
    const resetAll = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const session = EditSession.empty().push(mtuEdit);
    renderEditsTab(makeSandboxValue({ session, resetAll }));

    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Reset all edits"]')?.click();
    });

    expect(window.confirm).toHaveBeenCalledWith('This removes all 1 edits.');
    expect(resetAll).toHaveBeenCalledTimes(1);
  });

  it('does not reset when confirmation is cancelled', () => {
    const resetAll = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const session = EditSession.empty().push(mtuEdit);
    renderEditsTab(makeSandboxValue({ session, resetAll }));

    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Reset all edits"]')?.click();
    });

    expect(resetAll).not.toHaveBeenCalled();
  });

  it('disables reset all when the visible session is empty', () => {
    renderEditsTab(makeSandboxValue());

    expect(
      container?.querySelector<HTMLButtonElement>('[aria-label="Reset all edits"]')?.disabled,
    ).toBe(true);
  });
});
