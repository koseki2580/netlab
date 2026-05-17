/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabUIContext, type NetlabUIContextValue } from './NetlabUIContext';
import { ZeroStateHint } from './ZeroStateHint';

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
  if (!root) root = createRoot(container);
  act(() => {
    root?.render(ui);
  });
}

function rerender(ui: React.ReactElement) {
  act(() => {
    root?.render(ui);
  });
}

function makeCtx(selectedNodeId: string | null): NetlabUIContextValue {
  return { selectedNodeId, setSelectedNodeId: () => {} };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
  vi.useRealTimers();
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
});

describe('ZeroStateHint', () => {
  it('renders the default copy on first mount with no provider', () => {
    render(<ZeroStateHint fadeAfterMs={0} />);
    expect(container?.querySelector('[data-netlab-zero-state-hint]')).not.toBeNull();
    expect(container?.textContent ?? '').toContain('select any node to inspect');
  });

  it('does not render once the localStorage flag is `1`', () => {
    window.localStorage.setItem('nl_seen_select_hint', '1');
    render(<ZeroStateHint fadeAfterMs={0} />);
    expect(container?.querySelector('[data-netlab-zero-state-hint]')).toBeNull();
  });

  it('is suppressed when `suppress` is set', () => {
    render(<ZeroStateHint suppress fadeAfterMs={0} />);
    expect(container?.querySelector('[data-netlab-zero-state-hint]')).toBeNull();
  });

  it('hides as soon as a node is selected and writes the seen flag', () => {
    render(
      <NetlabUIContext.Provider value={makeCtx(null)}>
        <ZeroStateHint fadeAfterMs={0} />
      </NetlabUIContext.Provider>,
    );
    expect(container?.querySelector('[data-netlab-zero-state-hint]')).not.toBeNull();

    rerender(
      <NetlabUIContext.Provider value={makeCtx('r1')}>
        <ZeroStateHint fadeAfterMs={0} />
      </NetlabUIContext.Provider>,
    );
    // The fade starts immediately; the element either is gone or has opacity 0.
    const el = container?.querySelector('[data-netlab-zero-state-hint]') as HTMLElement | null;
    if (el) {
      expect(el.style.opacity).toBe('0');
    }
    expect(window.localStorage.getItem('nl_seen_select_hint')).toBe('1');
  });

  it('auto-dismisses after the configured delay', () => {
    vi.useFakeTimers();
    render(<ZeroStateHint fadeAfterMs={500} />);
    expect(container?.querySelector('[data-netlab-zero-state-hint]')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const el = container?.querySelector('[data-netlab-zero-state-hint]') as HTMLElement | null;
    if (el) {
      expect(el.style.opacity).toBe('0');
    }
    expect(window.localStorage.getItem('nl_seen_select_hint')).toBe('1');
    vi.useRealTimers();
  });
});
