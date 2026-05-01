/* @vitest-environment jsdom */

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { EditSession } from '../../sandbox/EditSession';
import { SandboxContext, type SandboxContextValue } from '../../sandbox/SandboxContext';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import type { BranchedSimulationEngine } from '../../sandbox/BranchedSimulationEngine';
import type { NetlabContextValue } from '../../components/NetlabContext';
import { NetlabContext } from '../../components/NetlabContext';
import { EmbedBridge } from '../EmbedBridge';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let hookEngine: HookEngine;
let postMessageSpy: ReturnType<
  typeof vi.fn<(message: unknown, targetOrigin?: string | WindowPostMessageOptions) => void>
>;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeNetlabContext(overrides: Partial<NetlabContextValue> = {}): NetlabContextValue {
  return {
    topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },
    routeTable: new Map(),
    areas: [],
    hookEngine,
    sandboxEnabled: true,
    ...overrides,
  };
}

function makeSandboxValue(overrides: Partial<SandboxContextValue> = {}): SandboxContextValue {
  return {
    mode: 'alpha',
    session: EditSession.empty(),
    engine: {
      snapshot: {
        topology: { nodes: [], edges: [], areas: [], routeTables: new Map() },
        annotations: [],
        snapshotRegistry: [],
        orphanedSnapshotRegistry: [],
      },
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

function renderBridge(
  netlabOverrides: Partial<NetlabContextValue> = {},
  sandboxOverrides: Partial<SandboxContextValue> = {},
) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(
      <NetlabContext.Provider value={makeNetlabContext(netlabOverrides)}>
        <SandboxContext.Provider value={makeSandboxValue(sandboxOverrides)}>
          <EmbedBridge />
        </SandboxContext.Provider>
      </NetlabContext.Provider>,
    );
  });
}

function postedEvents() {
  return postMessageSpy.mock.calls.map(([event, origin]) => ({ event, origin }));
}

function lastPostedEvent() {
  const events = postedEvents();
  return events[events.length - 1];
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  hookEngine = new HookEngine();
  vi.useFakeTimers();
  window.history.replaceState({}, '', '/?sandbox=1#/networking/mtu-fragmentation');
  postMessageSpy =
    vi.fn<(message: unknown, targetOrigin?: string | WindowPostMessageOptions) => void>();
  vi.spyOn(window.parent, 'postMessage').mockImplementation(
    (message: unknown, targetOrigin?: WindowPostMessageOptions) => {
      postMessageSpy(message, targetOrigin);
    },
  );
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('EmbedBridge', () => {
  it('does not emit any messages when parentOrigin is absent', async () => {
    renderBridge();

    await act(async () => {
      await hookEngine.emit('sandbox:edit-applied', { edit: { kind: 'noop' } });
      vi.advanceTimersByTime(120);
    });

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('emits sandbox-ready when parentOrigin is set', () => {
    renderBridge({ parentOrigin: 'https://teacher.example' });

    expect(postedEvents()).toEqual([
      {
        event: {
          type: 'sandbox-ready',
          version: '1',
          scenarioId: 'fragmented-echo',
          editCount: 0,
        },
        origin: 'https://teacher.example',
      },
    ]);
  });

  it('coalesces edit count changes within the debounce window', async () => {
    renderBridge({ parentOrigin: 'https://teacher.example' });

    await act(async () => {
      await hookEngine.emit('sandbox:edit-applied', { edit: { kind: 'noop' } });
      await hookEngine.emit('sandbox:edit-applied', { edit: { kind: 'noop' } });
      vi.advanceTimersByTime(99);
    });
    expect(postMessageSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(lastPostedEvent()).toEqual({
      event: {
        type: 'sandbox-edit-count-changed',
        count: 2,
        scenarioId: 'fragmented-echo',
      },
      origin: 'https://teacher.example',
    });
  });

  it('uses hook payload heads for undo and redo events', async () => {
    renderBridge({ parentOrigin: 'https://teacher.example' });

    await act(async () => {
      await hookEngine.emit('sandbox:edit-undone', { edit: { kind: 'noop' }, head: 1 });
      vi.advanceTimersByTime(100);
    });

    expect(lastPostedEvent()?.event).toMatchObject({
      type: 'sandbox-edit-count-changed',
      count: 1,
    });
  });

  it('emits assessment pass events to every whitelisted origin', async () => {
    renderBridge({
      parentOrigin: ['https://teacher.example', 'https://course.example'],
    });

    await act(async () => {
      await hookEngine.emit('sandbox:assessment-passed', {
        rubricId: 'ospf-backup',
        hintsUsed: 2,
        durationMs: 1500,
      });
    });

    expect(postedEvents().slice(-2)).toEqual([
      {
        event: {
          type: 'sandbox-assessment-passed',
          rubricId: 'ospf-backup',
          hintsUsed: 2,
          durationMs: 1500,
        },
        origin: 'https://teacher.example',
      },
      {
        event: {
          type: 'sandbox-assessment-passed',
          rubricId: 'ospf-backup',
          hintsUsed: 2,
          durationMs: 1500,
        },
        origin: 'https://course.example',
      },
    ]);
  });

  it('emits session export metadata', async () => {
    renderBridge({ parentOrigin: 'https://teacher.example' });

    await act(async () => {
      await hookEngine.emit('sandbox:session-exported', {
        sizeBytes: 2048,
        scenarioId: 'fragmented-echo',
      });
    });

    expect(lastPostedEvent()).toEqual({
      event: {
        type: 'sandbox-session-exported',
        sizeBytes: 2048,
        scenarioId: 'fragmented-echo',
      },
      origin: 'https://teacher.example',
    });
  });

  it('ignores invalid parent origins', () => {
    renderBridge({ parentOrigin: '*' });

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('keeps existing session size in the ready event', () => {
    renderBridge(
      { parentOrigin: 'https://teacher.example' },
      { session: EditSession.empty().push({ kind: 'noop' }) },
    );

    expect(postedEvents()[0]?.event).toMatchObject({ editCount: 1 });
  });

  it('does not render visible DOM', () => {
    renderBridge({ parentOrigin: 'https://teacher.example' });

    expect(container?.textContent).toBe('');
  });

  it('can be created as a React element for provider mounting', () => {
    expect(createElement(EmbedBridge).type).toBe(EmbedBridge);
  });
});
