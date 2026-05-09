/* @vitest-environment jsdom */

import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../../sandbox/SandboxContext';
import { DEFAULT_PARAMETERS } from '../../../sandbox/types';
import type { AssessmentContextValue } from '../../../assessments/AssessmentProvider';
import { AssessmentContext } from '../../../assessments/AssessmentContext';
import { ospfConvergence } from '../../../scenarios/ospf-convergence';
import { ScenarioExportDialog } from './ScenarioExportDialog';

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let downloads: { download: string; blob: Blob }[] = [];
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function snapshot() {
  return {
    id: 'snapshot-1',
    capturedAt: 1,
    topology: {
      nodes: [
        {
          id: 'host-a',
          type: 'client',
          position: { x: 0, y: 0 },
          data: { label: 'Host A', role: 'client', layerId: 'l7' },
        },
      ],
      edges: [],
      areas: [],
      routeTables: new Map(),
    },
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
    parameters: DEFAULT_PARAMETERS,
    annotations: [
      {
        id: 'annotation-1',
        traceEventId: 'trace-1:0',
        author: 'user',
        content: 'Instructor note',
        createdAt: 0,
      },
    ],
    snapshotRegistry: [],
    orphanedSnapshotRegistry: [],
  };
}

function makeSandboxValue(overrides: Partial<SandboxContextValue> = {}): SandboxContextValue {
  const current = snapshot();
  return {
    mode: 'alpha',
    session: EditSession.empty().push({ kind: 'noop' }),
    engine: {
      root: current,
      snapshot: current,
      parameters: DEFAULT_PARAMETERS,
    } as unknown as BranchedSimulationEngine,
    activeEditor: null,
    diffFilter: 'all',
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

function makeAssessmentValue(): AssessmentContextValue {
  return {
    scenarioId: 'ospf-convergence',
    rubric: ospfConvergence.assessmentRubric!,
    status: {
      status: 'active',
      rubricId: ospfConvergence.assessmentRubric!.id,
      subgoalResults: [],
      hintsUsed: [],
      startedAt: 0,
      passedAt: null,
    },
    useHint: vi.fn(),
    exit: vi.fn(),
    failConstraint: vi.fn(),
  };
}

function render(ui: ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(ui));
}

async function click(name: string) {
  await act(async () => {
    container?.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)?.click();
  });
}

async function blobText(index = 0): Promise<string> {
  return downloads[index]?.blob.text() ?? '';
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  downloads = [];
  window.history.replaceState({}, '', '/?sandbox=1#/networking/mtu-fragmentation');
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn((blob: Blob) => {
      downloads.push({ download: '', blob });
      return `blob:scenario-${downloads.length}`;
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
    const last = downloads[downloads.length - 1];
    if (last) downloads[downloads.length - 1] = { ...last, download: this.download };
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: originalCreateObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: originalRevokeObjectURL,
  });
});

describe('ScenarioExportDialog', () => {
  it('renders a TypeScript preview with annotations excluded by default', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <ScenarioExportDialog open onClose={vi.fn()} />
      </SandboxContext.Provider>,
    );

    expect(container?.textContent).toContain('export const fragmentedEchoExport');
    expect(container?.textContent).not.toContain('Instructor note');
  });

  it('downloads generated TypeScript using the scenario id as the filename', async () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <ScenarioExportDialog open onClose={vi.fn()} />
      </SandboxContext.Provider>,
    );

    await click('Download scenario TypeScript');

    expect(downloads[0]?.download).toBe('fragmented-echo-export.ts');
    expect(await blobText()).toContain("id: 'fragmented-echo-export'");
  });

  it('downloads delta JSON with visible preseed edits when delta strategy is selected', async () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <ScenarioExportDialog open onClose={vi.fn()} />
      </SandboxContext.Provider>,
    );
    const delta = container?.querySelector<HTMLInputElement>(
      'input[aria-label="Export as preseed edit delta"]',
    );

    await act(async () => {
      delta?.click();
    });
    await click('Download scenario JSON');

    expect(downloads[0]?.download).toBe('fragmented-echo-export.netlabscenario.json');
    expect(JSON.parse(await blobText()).scenario.preseedEdits).toEqual([{ kind: 'noop' }]);
  });

  it('blocks downloads and renders validation errors for invalid ids', async () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <ScenarioExportDialog open onClose={vi.fn()} />
      </SandboxContext.Provider>,
    );
    const input = container?.querySelector<HTMLInputElement>('input[aria-label="Scenario id"]');

    await act(async () => {
      if (input) {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          input,
          'Invalid Id',
        );
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await click('Download scenario TypeScript');

    expect(downloads).toHaveLength(0);
    expect(container?.textContent).toContain('scenarioId must be kebab-case');
  });

  it('references the active assessment rubric by id when selected', async () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <AssessmentContext.Provider value={makeAssessmentValue()}>
          <ScenarioExportDialog open onClose={vi.fn()} />
        </AssessmentContext.Provider>
      </SandboxContext.Provider>,
    );
    const rubric = container?.querySelector<HTMLInputElement>(
      'input[aria-label="Attach assessment rubric"]',
    );

    await act(async () => {
      rubric?.click();
    });
    await click('Download scenario TypeScript');

    expect(await blobText()).toContain(
      "scenarioRegistry.get('ospf-convergence')!.assessmentRubric!",
    );
  });
});
