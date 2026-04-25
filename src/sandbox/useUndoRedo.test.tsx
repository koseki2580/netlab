/* @vitest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine, hookEngine } from '../hooks/HookEngine';
import { basicArp } from '../scenarios';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { SandboxProvider, useSandbox, type SandboxContextValue } from './SandboxContext';
import { useUndoRedo } from './useUndoRedo';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let engine: SimulationEngine;
let latestSandbox: SandboxContextValue | null = null;
let latestUndoRedo: ReturnType<typeof useUndoRedo> | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeSimulationValue(): SimulationContextValue {
  return {
    engine,
    state: engine.getState(),
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

function CaptureSandbox({ withTextarea = false }: { readonly withTextarea?: boolean }) {
  latestSandbox = useSandbox();
  return (
    <div>
      <button type="button" data-testid="sandbox-focus">
        sandbox focus
      </button>
      {withTextarea ? <textarea aria-label="sandbox notes" /> : null}
    </div>
  );
}

function UndoProbe() {
  latestSandbox = useSandbox();
  latestUndoRedo = useUndoRedo();
  return (
    <button type="button" data-testid="undo-probe">
      undo probe
    </button>
  );
}

function currentSandbox(): SandboxContextValue {
  if (!latestSandbox) {
    throw new Error('sandbox context was not captured');
  }

  return latestSandbox;
}

function currentUndoRedo(): ReturnType<typeof useUndoRedo> {
  if (!latestUndoRedo) {
    throw new Error('undo/redo hook was not captured');
  }

  return latestUndoRedo;
}

function renderSandbox(
  children: ReactNode = <CaptureSandbox />,
  props: { readonly enableShortcuts?: boolean } = {},
) {
  render(
    <SimulationContext.Provider value={makeSimulationValue()}>
      <SandboxProvider {...props}>{children}</SandboxProvider>
    </SimulationContext.Provider>,
  );
}

function dispatchUndoKey(options: { readonly shiftKey?: boolean } = {}) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      shiftKey: options.shiftKey ?? false,
      bubbles: true,
    }),
  );
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  engine = new SimulationEngine(basicArp.topology, new HookEngine());
  latestSandbox = null;
  latestUndoRedo = null;
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestSandbox = null;
  latestUndoRedo = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('useUndoRedo', () => {
  it('returns undo and redo state derived from the current session', () => {
    renderSandbox(<UndoProbe />);

    expect(currentUndoRedo().canUndo).toBe(false);
    expect(currentUndoRedo().canRedo).toBe(false);

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
    });

    expect(currentUndoRedo().canUndo).toBe(true);
    expect(currentUndoRedo().canRedo).toBe(false);
  });

  it('undo reduces the session head and emits sandbox:edit-undone', async () => {
    const undone = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:edit-undone', async (payload, next) => {
      undone(payload);
      await next();
    });

    renderSandbox(<UndoProbe />);

    await act(async () => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentUndoRedo().undo();
      await Promise.resolve();
    });

    unsubscribe();
    expect(currentSandbox().session.head).toBe(0);
    expect(currentSandbox().session.canRedo()).toBe(true);
    expect(undone).toHaveBeenCalledWith({ edit: { kind: 'noop' }, head: 0 });
  });

  it('undo at the boundary emits sandbox:undo-blocked', async () => {
    const blocked = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:undo-blocked', async (payload, next) => {
      blocked(payload);
      await next();
    });

    renderSandbox(<UndoProbe />);

    await act(async () => {
      currentUndoRedo().undo();
      await Promise.resolve();
    });

    unsubscribe();
    expect(currentSandbox().session.head).toBe(0);
    expect(blocked).toHaveBeenCalledWith({ head: 0 });
  });

  it('undo does not cross an intro-provided undo floor', async () => {
    const blocked = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:undo-blocked', async (payload, next) => {
      blocked(payload);
      await next();
    });

    renderSandbox(<UndoProbe />);

    await act(async () => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().pushEdit({
        kind: 'param.set',
        key: 'engine.tickMs',
        before: 100,
        after: 200,
      });
      currentSandbox().setUndoFloor?.(1);
      currentUndoRedo().undo();
      currentUndoRedo().undo();
      await Promise.resolve();
    });

    unsubscribe();
    expect(currentSandbox().session.head).toBe(1);
    expect(blocked).toHaveBeenCalledWith({ head: 1 });
  });

  it('resetAll clears the undo floor', async () => {
    renderSandbox(<UndoProbe />);

    await act(async () => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().setUndoFloor?.(1);
      currentUndoRedo().resetAll();
      currentSandbox().pushEdit({ kind: 'noop' });
      currentUndoRedo().undo();
      await Promise.resolve();
    });

    expect(currentSandbox().session.head).toBe(0);
  });

  it('redo restores the next redo-tail edit and emits sandbox:edit-redone', async () => {
    const redone = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:edit-redone', async (payload, next) => {
      redone(payload);
      await next();
    });

    renderSandbox(<UndoProbe />);

    await act(async () => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentUndoRedo().undo();
      currentUndoRedo().redo();
      await Promise.resolve();
    });

    unsubscribe();
    expect(currentSandbox().session.head).toBe(1);
    expect(currentSandbox().session.canRedo()).toBe(false);
    expect(redone).toHaveBeenCalledWith({ edit: { kind: 'noop' }, head: 1 });
  });

  it('undo replays visible edits from the initial snapshot instead of the mutated what-if state', () => {
    renderSandbox(<UndoProbe />);

    act(() => {
      currentSandbox().pushEdit({
        kind: 'param.set',
        key: 'engine.tickMs',
        before: 100,
        after: 200,
      });
    });

    expect(currentSandbox().engine.parameters.engine.tickMs).toBe(200);

    act(() => {
      currentUndoRedo().undo();
    });

    expect(currentSandbox().engine.parameters.engine.tickMs).toBe(100);
  });

  it('push after undo truncates the redo tail through provider state', () => {
    renderSandbox(<UndoProbe />);

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().pushEdit({
        kind: 'param.set',
        key: 'engine.tickMs',
        before: 100,
        after: 200,
      });
      currentUndoRedo().undo();
      currentSandbox().pushEdit({ kind: 'param.set', key: 'engine.maxTtl', before: 64, after: 32 });
    });

    expect(currentSandbox().session.edits.map((edit) => edit.kind)).toEqual(['noop', 'param.set']);
    expect(
      currentSandbox().session.backing[currentSandbox().session.backing.length - 1],
    ).toMatchObject({ key: 'engine.maxTtl' });
    expect(currentSandbox().session.canRedo()).toBe(false);
  });

  it('resetAll clears the session and emits sandbox:reset-all once', async () => {
    const reset = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:reset-all', async (payload, next) => {
      reset(payload);
      await next();
    });

    renderSandbox(<UndoProbe />);

    await act(async () => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentUndoRedo().resetAll();
      await Promise.resolve();
    });

    unsubscribe();
    expect(currentSandbox().session.size()).toBe(0);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith({ count: 1 });
  });

  it('Cmd+Z from inside the provider subtree triggers undo by default', () => {
    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      container?.querySelector<HTMLButtonElement>('[data-testid="sandbox-focus"]')?.focus();
      dispatchUndoKey();
    });

    expect(currentSandbox().session.head).toBe(0);
  });

  it('Cmd+Shift+Z from inside the provider subtree triggers redo', () => {
    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      currentSandbox().undo();
      container?.querySelector<HTMLButtonElement>('[data-testid="sandbox-focus"]')?.focus();
      dispatchUndoKey({ shiftKey: true });
    });

    expect(currentSandbox().session.head).toBe(1);
  });

  it('keyboard shortcuts are ignored inside native text fields', () => {
    renderSandbox(<CaptureSandbox withTextarea />);

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      container?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      dispatchUndoKey();
    });

    expect(currentSandbox().session.head).toBe(1);
  });

  it('enableShortcuts=false disables keyboard undo', () => {
    renderSandbox(<CaptureSandbox />, { enableShortcuts: false });

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      container?.querySelector<HTMLButtonElement>('[data-testid="sandbox-focus"]')?.focus();
      dispatchUndoKey();
    });

    expect(currentSandbox().session.head).toBe(1);
  });

  it('unmount detaches the keyboard listener', async () => {
    const undone = vi.fn();
    const unsubscribe = hookEngine.on('sandbox:edit-undone', async (payload, next) => {
      undone(payload);
      await next();
    });

    renderSandbox();

    act(() => {
      currentSandbox().pushEdit({ kind: 'noop' });
      root?.unmount();
      dispatchUndoKey();
    });
    await Promise.resolve();

    unsubscribe();
    expect(undone).not.toHaveBeenCalled();
  });
});
