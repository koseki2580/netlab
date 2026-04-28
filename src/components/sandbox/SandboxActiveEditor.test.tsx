/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import type { PluginEdit, PluginEditSpec } from '../../sandbox/plugin/types';
import { registerSandboxEdit } from '../../sandbox/plugin/registry';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import { SandboxActiveEditor } from './SandboxActiveEditor';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const unregisters: (() => void)[] = [];
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface EditorPluginEdit extends PluginEdit {
  readonly kind: 'plugin:test.editor';
  readonly target: { readonly kind: 'node'; readonly nodeId: string };
  readonly value: string;
}

function isEditorPluginEdit(value: unknown): value is EditorPluginEdit {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'plugin:test.editor' &&
    typeof (value as { value?: unknown }).value === 'string'
  );
}

const editorPluginSpec: PluginEditSpec<EditorPluginEdit> = {
  version: 1,
  kind: 'plugin:test.editor',
  validator: isEditorPluginEdit,
  serializer: {
    encode: (edit) => edit.value,
    decode: (value) => {
      const edit = {
        kind: 'plugin:test.editor',
        target: { kind: 'node', nodeId: 'router-1' },
        value,
      } as const;
      return isEditorPluginEdit(edit) ? edit : null;
    },
  },
  reducer: (snapshot) => snapshot,
  editor: ({ target, onCommit }) => (
    <button
      type="button"
      onClick={() => {
        if (target.kind === 'node') {
          onCommit({
            kind: 'plugin:test.editor',
            target,
            value: 'from editor',
          });
        }
      }}
    >
      Apply plugin editor
    </button>
  ),
  labelFn: (edit) => edit.value,
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

function anchorElement(): HTMLElement {
  const element = document.createElement('button');
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 20,
      bottom: 20,
      width: 20,
      height: 20,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(element);
  return element;
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
    activeEditor: {
      target: { kind: 'node', nodeId: 'router-1' },
      anchorElement: anchorElement(),
    },
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
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  document.body.replaceChildren();
  container = null;
  vi.restoreAllMocks();
  while (unregisters.length > 0) unregisters.pop()?.();
});

describe('SandboxActiveEditor plugin editors', () => {
  it('renders registered plugin editors and commits through sandbox.pushEdit', () => {
    unregisters.push(registerSandboxEdit(editorPluginSpec));
    const pushEdit = vi.fn();
    const closeEditPopover = vi.fn();

    render(
      <SandboxContext.Provider value={makeSandboxValue({ pushEdit, closeEditPopover })}>
        <SandboxActiveEditor />
      </SandboxContext.Provider>,
    );

    act(() => {
      Array.from(container?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        .find((button) => button.textContent === 'Apply plugin editor')
        ?.click();
    });

    expect(pushEdit).toHaveBeenCalledWith({
      kind: 'plugin:test.editor',
      target: { kind: 'node', nodeId: 'router-1' },
      value: 'from editor',
    });
    expect(closeEditPopover).toHaveBeenCalledTimes(1);
  });
});
