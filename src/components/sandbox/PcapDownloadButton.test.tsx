/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import { PcapDownloadButton } from './PcapDownloadButton';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const clickedDownloads: { download: string; href: string }[] = [];
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const actEnv = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) root = createRoot(container);
  act(() => root?.render(ui));
}

function makeSandboxValue(overrides: Partial<SandboxContextValue> = {}): SandboxContextValue {
  const whatIfMock = {
    exportPcapRecords: vi.fn(() => []),
    exportPcap: vi.fn(() => new Uint8Array(24)),
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
    getTopology: vi.fn(() => ({ nodes: [], edges: [], areas: [], routeTables: new Map() })),
  };

  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      whatIf: whatIfMock,
      baseline: null,
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

beforeEach(() => {
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
  clickedDownloads.length = 0;
  window.history.replaceState({}, '', '/#/networking/mtu-fragmentation');

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn((blob: Blob) => {
      const href = `blob:pcap-${clickedDownloads.length + 1}`;
      clickedDownloads.push({ download: '', href });
      void blob;
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
    if (last) last.download = this.download;
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  actEnv.IS_REACT_ACT_ENVIRONMENT = false;
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
  }
  if (typeof originalRevokeObjectURL === 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
  }
});

describe('PcapDownloadButton — alpha mode', () => {
  it('renders a PCAP button with correct aria-label', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <PcapDownloadButton />
      </SandboxContext.Provider>,
    );
    expect(container?.querySelector('[aria-label="Download sandbox PCAP"]')).not.toBeNull();
  });

  it('does not render the beta branch selector in alpha mode', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <PcapDownloadButton />
      </SandboxContext.Provider>,
    );
    expect(container?.querySelector('[aria-label="PCAP branch selection"]')).toBeNull();
  });

  it('triggers a download on button click', () => {
    render(
      <SandboxContext.Provider value={makeSandboxValue()}>
        <PcapDownloadButton />
      </SandboxContext.Provider>,
    );
    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Download sandbox PCAP"]')?.click();
    });
    expect(clickedDownloads).toHaveLength(1);
    expect(clickedDownloads[0]?.download).toMatch(/netlab-sandbox-fragmented-echo-\d{12}\.pcap$/);
  });
});

describe('PcapDownloadButton — beta mode', () => {
  function makeBetaMock() {
    const baselineMock = {
      exportPcapRecords: vi.fn(() => []),
      exportPcap: vi.fn(() => new Uint8Array(24)),
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
      getTopology: vi.fn(() => ({ nodes: [], edges: [], areas: [], routeTables: new Map() })),
    };
    const whatIfMock = {
      exportPcapRecords: vi.fn(() => []),
      exportPcap: vi.fn(() => new Uint8Array(24)),
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
      getTopology: vi.fn(() => ({ nodes: [], edges: [], areas: [], routeTables: new Map() })),
    };
    return makeSandboxValue({
      mode: 'beta',
      engine: {
        whatIf: whatIfMock,
        baseline: baselineMock,
        parameters: DEFAULT_PARAMETERS,
      } as unknown as BranchedSimulationEngine,
    });
  }

  it('renders the branch selector in beta mode', () => {
    render(
      <SandboxContext.Provider value={makeBetaMock()}>
        <PcapDownloadButton />
      </SandboxContext.Provider>,
    );
    expect(container?.querySelector('[aria-label="PCAP branch selection"]')).not.toBeNull();
  });

  it('selector has What-if, Baseline, and Combined options', () => {
    render(
      <SandboxContext.Provider value={makeBetaMock()}>
        <PcapDownloadButton />
      </SandboxContext.Provider>,
    );
    const opts = Array.from(container?.querySelectorAll('option') ?? []);
    const labels = opts.map((o) => o.textContent);
    expect(labels).toEqual(expect.arrayContaining(['What-if', 'Baseline', 'Combined']));
  });

  it('forceBranch skips the selector and uses fixed branch in label', () => {
    render(
      <SandboxContext.Provider value={makeBetaMock()}>
        <PcapDownloadButton forceBranch="baseline" />
      </SandboxContext.Provider>,
    );
    expect(container?.querySelector('[aria-label="PCAP branch selection"]')).toBeNull();
    expect(
      container?.querySelector('[aria-label="Download sandbox PCAP (baseline)"]'),
    ).not.toBeNull();
  });

  it('triggers a download with a baseline-named file when baseline selected', () => {
    render(
      <SandboxContext.Provider value={makeBetaMock()}>
        <PcapDownloadButton forceBranch="baseline" />
      </SandboxContext.Provider>,
    );
    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Download sandbox PCAP (baseline)"]')
        ?.click();
    });
    expect(clickedDownloads).toHaveLength(1);
    expect(clickedDownloads[0]?.download).toContain('baseline');
  });
});
