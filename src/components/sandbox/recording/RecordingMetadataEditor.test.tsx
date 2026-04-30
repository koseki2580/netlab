/* @vitest-environment jsdom */

import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabContext, type NetlabContextValue } from '../../../components/NetlabContext';
import { HookEngine } from '../../../hooks/HookEngine';
import { basicArp, scenarioRegistry } from '../../../scenarios';
import {
  SimulationContext,
  type SimulationContextValue,
} from '../../../simulation/SimulationContext';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import type { SimulationState } from '../../../types/simulation';
import { SandboxProvider } from '../../../sandbox/SandboxContext';
import { SandboxRecorderProvider } from '../../../sandbox/recording/SandboxRecorderProvider';
import type { RecordedSession } from '../../../sandbox/recording/types';
import { validateRecordedSession } from '../../../sandbox/recording/schema';
import { RecordingMetadataEditor, recordingFilename } from './RecordingMetadataEditor';

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

function makeNetlabContext(hookEngine: HookEngine): NetlabContextValue {
  return {
    topology: basicArp.topology,
    routeTable: new Map(),
    areas: [],
    hookEngine,
  };
}

function makeSimulationValue(engine: SimulationEngine): SimulationContextValue {
  return {
    engine,
    state: makeState(),
    sendPacket: vi.fn(async () => undefined),
    simulateDhcp: vi.fn(async () => false),
    simulateDns: vi.fn(async () => null),
    getDhcpLeaseState: vi.fn(() => null),
    getDnsCache: vi.fn(() => null),
    exportPcap: vi.fn(() => new Uint8Array()),
    animationSpeed: 500,
    setAnimationSpeed: vi.fn(),
    isRecomputing: false,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let lastSaved: RecordedSession | null = null;
let lastDownloaded: RecordedSession | null = null;

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }
  act(() => {
    root?.render(<StrictMode>{ui}</StrictMode>);
  });
}

interface RenderOptions {
  open?: boolean;
}

function renderEditor(options: RenderOptions = {}) {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(basicArp.topology, hookEngine);
  render(
    <NetlabContext.Provider value={makeNetlabContext(hookEngine)}>
      <SimulationContext.Provider value={makeSimulationValue(engine)}>
        <SandboxProvider>
          <SandboxRecorderProvider>
            <RecordingMetadataEditor
              scenarioId="basic-arp"
              open={options.open ?? true}
              onClose={() => undefined}
              onSaved={(session) => {
                lastSaved = session;
              }}
              download={(session) => {
                lastDownloaded = session;
              }}
            />
          </SandboxRecorderProvider>
        </SandboxProvider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  lastSaved = null;
  lastDownloaded = null;
  if (!scenarioRegistry.get('basic-arp')) {
    scenarioRegistry.register(basicArp);
  }
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('RecordingMetadataEditor', () => {
  it('does not render when open=false', () => {
    renderEditor({ open: false });
    expect(container?.querySelector('[data-testid="recording-metadata-editor"]')).toBeNull();
  });

  it('renders the dialog with title/author/notes inputs when open', () => {
    renderEditor();
    expect(container?.querySelector('[data-testid="recording-metadata-editor"]')).not.toBeNull();
    expect(container?.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(2);
    expect(container?.querySelector('textarea')).not.toBeNull();
  });

  it('Save button is disabled until a non-empty title is provided', () => {
    renderEditor();
    const saveBtn = container?.querySelector(
      '[data-testid="recording-metadata-save"]',
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    const titleInput = container?.querySelector('input[type="text"]') as HTMLInputElement;
    act(() => {
      setInputValue(titleInput, 'My demo');
    });
    expect(saveBtn.disabled).toBe(false);
  });

  it('Save button stays disabled when title exceeds the max length', () => {
    renderEditor();
    const titleInput = container?.querySelector('input[type="text"]') as HTMLInputElement;
    act(() => {
      setInputValue(titleInput, 'x'.repeat(201));
    });
    const saveBtn = container?.querySelector(
      '[data-testid="recording-metadata-save"]',
    ) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it('Save triggers stopAndExport and calls download with a valid recording', () => {
    renderEditor();
    const titleInput = container?.querySelector('input[type="text"]') as HTMLInputElement;
    act(() => {
      setInputValue(titleInput, 'Working demo');
    });
    const saveBtn = container?.querySelector(
      '[data-testid="recording-metadata-save"]',
    ) as HTMLButtonElement;
    act(() => {
      saveBtn.click();
    });
    expect(lastDownloaded).not.toBeNull();
    expect(lastSaved).not.toBeNull();
    expect(() => validateRecordedSession(lastDownloaded)).not.toThrow();
    expect(lastDownloaded?.metadata.title).toBe('Working demo');
    expect(lastDownloaded?.metadata.scenarioId).toBe('basic-arp');
  });

  it('Cancel does not call download', () => {
    renderEditor();
    const cancelBtn = container?.querySelector(
      '[data-testid="recording-metadata-cancel"]',
    ) as HTMLButtonElement;
    act(() => {
      cancelBtn.click();
    });
    expect(lastDownloaded).toBeNull();
  });

  it('renders a markdown preview that escapes raw HTML', () => {
    renderEditor();
    const titleInput = container?.querySelector('input[type="text"]') as HTMLInputElement;
    act(() => {
      setInputValue(titleInput, 'hello **bold** <script>alert(1)</script>');
    });
    const preview = container?.querySelector('[data-testid="recording-title-preview"]');
    expect(preview).not.toBeNull();
    // No raw script element should appear in the preview.
    expect(preview?.querySelector('script')).toBeNull();
    expect(preview?.querySelector('strong')).not.toBeNull();
  });

  it('recordingFilename produces .netlabrec.json with scenario id', () => {
    const date = new Date('2026-04-21T12:34:00Z');
    const name = recordingFilename('mtu', date);
    expect(name.endsWith('.netlabrec.json')).toBe(true);
    expect(name).toContain('mtu');
  });
});
