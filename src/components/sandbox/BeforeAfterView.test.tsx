/* @vitest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { fromEngine } from '../../sandbox/SimulationSnapshot';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import type { SandboxMode } from '../../sandbox/types';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import type { SimulationState } from '../../types/simulation';
import { BeforeAfterView } from './BeforeAfterView';

const canvasState = vi.hoisted(() => ({
  moveHandlers: [] as ((viewport: { x: number; y: number; zoom: number }) => void)[],
}));

vi.mock('../NetlabCanvas', async () => {
  const React = await import('react');
  const { useSimulation } = await import('../../simulation/SimulationContext');

  return {
    NetlabCanvas: ({
      onViewportChange,
      viewport,
    }: {
      onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
      viewport?: { x: number; y: number; zoom: number };
    }) => {
      const simulation = useSimulation();
      if (onViewportChange) {
        canvasState.moveHandlers.push(onViewportChange);
      }

      return React.createElement('div', {
        'data-testid': 'mock-canvas',
        'data-step': simulation.state.currentStep,
        'data-viewport': JSON.stringify(viewport),
      });
    },
  };
});

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

function makeRunner(mode: SandboxMode): BranchedSimulationEngine {
  const base = new SimulationEngine(directTopology(), new HookEngine());
  base.setState(makeState({ currentStep: 2 }));
  return new BranchedSimulationEngine(fromEngine(base), { mode });
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

function renderWithSandbox(mode: SandboxMode, children: ReactNode = <BeforeAfterView />) {
  const runner = makeRunner(mode);
  const value: SandboxContextValue = {
    mode,
    session: EditSession.empty(),
    engine: runner,
    activeEditor: null,
    diffFilter: 'all',
    pushEdit: vi.fn(),
    switchMode: vi.fn(),
    resetBaseline: vi.fn(),
    openEditPopover: vi.fn(),
    closeEditPopover: vi.fn(),
    setDiffFilter: vi.fn(),
  };

  render(<SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>);

  return runner;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  canvasState.moveHandlers = [];
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

describe('BeforeAfterView', () => {
  it('renders nothing in alpha mode', () => {
    renderWithSandbox('alpha');

    expect(container?.querySelector('[data-testid="before-after-view"]')).toBeNull();
  });

  it('renders two canvases in beta mode', () => {
    renderWithSandbox('beta');

    expect(container?.querySelectorAll('[data-testid="mock-canvas"]')).toHaveLength(2);
  });

  it('unmounts the second canvas when rerendered in alpha mode', () => {
    renderWithSandbox('beta');
    renderWithSandbox('alpha');

    expect(container?.querySelectorAll('[data-testid="mock-canvas"]')).toHaveLength(0);
  });

  it('passes branch state through SimulationContext', () => {
    renderWithSandbox('beta');

    const canvases = Array.from(container?.querySelectorAll('[data-testid="mock-canvas"]') ?? []);
    expect(canvases.map((canvas) => canvas.getAttribute('data-step'))).toEqual(['2', '2']);
  });

  it('syncs viewport changes from either canvas', () => {
    renderWithSandbox('beta');
    const move = canvasState.moveHandlers[0];
    expect(move).toBeDefined();
    if (!move) return;

    act(() => {
      move({ x: 10, y: 20, zoom: 1.5 });
    });

    const canvases = Array.from(container?.querySelectorAll('[data-testid="mock-canvas"]') ?? []);
    expect(canvases.every((canvas) => canvas.getAttribute('data-viewport')?.includes('1.5'))).toBe(
      true,
    );
  });
});
