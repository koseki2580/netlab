/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SandboxNarrationRegion } from './SandboxNarrationRegion';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let hookEngine: HookEngine;
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) root = createRoot(container);
  act(() => {
    root?.render(ui);
  });
}

function narrationText(): string {
  return container?.querySelector('[data-testid="sandbox-narration-region"]')?.textContent ?? '';
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  hookEngine = new HookEngine();
  vi.useFakeTimers();
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
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SandboxNarrationRegion', () => {
  it('renders an aria-live="polite" region', () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);
    const el = container?.querySelector('[data-testid="sandbox-narration-region"]');
    expect(el?.getAttribute('aria-live')).toBe('polite');
  });

  it('is visually hidden (clip style)', () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);
    const el = container?.querySelector<HTMLElement>('[data-testid="sandbox-narration-region"]');
    expect(el?.style.clip).toContain('rect');
  });

  it('starts empty', () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);
    expect(narrationText()).toBe('');
  });

  it('announces an interface.mtu edit after throttle delay', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:edit-applied', {
        edit: {
          kind: 'interface.mtu',
          target: { kind: 'interface' as const, nodeId: 'router-1', ifaceId: 'eth0' },
          before: 1500,
          after: 500,
        },
      });
    });

    expect(narrationText()).toBe('');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(narrationText()).toContain('MTU set to 500');
    expect(narrationText()).toContain('router-1');
  });

  it('announces mode change to beta after throttle delay', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:mode-changed', { mode: 'beta' });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(narrationText()).toContain('Compare mode enabled');
  });

  it('announces mode change back to alpha', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:mode-changed', { mode: 'alpha' });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(narrationText()).toContain('Compare mode exited');
  });

  it('announces reset-all', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:reset-all', { count: 2 });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(narrationText()).toContain('All edits reset');
  });

  it('throttles multiple rapid events to one announcement', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:edit-applied', {
        edit: { kind: 'noop' },
      });
      await hookEngine.emit('sandbox:mode-changed', { mode: 'beta' });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const text = narrationText();
    expect(text).toContain('Compare mode enabled');
  });

  it('allows a second announcement after the throttle window passes', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:mode-changed', { mode: 'beta' });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(narrationText()).toContain('Compare mode enabled');

    await act(async () => {
      await hookEngine.emit('sandbox:mode-changed', { mode: 'alpha' });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(narrationText()).toContain('Compare mode exited');
  });

  it('announces edit-undone', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:edit-undone', {
        edit: {
          kind: 'interface.mtu',
          target: { kind: 'interface' as const, nodeId: 'r1', ifaceId: 'eth0' },
          before: 1500,
          after: 500,
        },
        head: 0,
      });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(narrationText()).toContain('Undone');
  });

  it('announces edit-redone', async () => {
    render(<SandboxNarrationRegion hookEngine={hookEngine} />);

    await act(async () => {
      await hookEngine.emit('sandbox:edit-redone', {
        edit: {
          kind: 'interface.mtu',
          target: { kind: 'interface' as const, nodeId: 'r1', ifaceId: 'eth0' },
          before: 1500,
          after: 500,
        },
        head: 1,
      });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(narrationText()).toContain('Redone');
  });
});
