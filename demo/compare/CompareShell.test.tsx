/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CompareShell } from './CompareShell';

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

function q(testid: string): HTMLElement | null {
  return container?.querySelector(`[data-testid="${testid}"]`) ?? null;
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('CompareShell', () => {
  // Unknown scenario ids render each pane's fallback, so the shell composition
  // and shared timeline bar can be asserted without the React Flow / sim stack.
  it('renders both panes and the shared timeline controls', () => {
    render(<CompareShell leftId="left-unknown" rightId="right-unknown" />);
    expect(q('compare-shell')).not.toBeNull();
    expect(q('compare-pane-left')).not.toBeNull();
    expect(q('compare-pane-right')).not.toBeNull();
    expect(q('compare-timeline')).not.toBeNull();
    expect(q('compare-play')).not.toBeNull();
  });

  it('disables play until a pane registers a trace (no steps yet)', () => {
    render(<CompareShell leftId="left-unknown" rightId="right-unknown" />);
    const play = q('compare-play') as HTMLButtonElement | null;
    expect(play?.disabled).toBe(true);
    expect(container?.textContent ?? '').toContain('step 0 / 0');
  });

  it('renders the speed control defaulting to 1× (P12)', () => {
    render(<CompareShell leftId="left-unknown" rightId="right-unknown" />);
    expect(q('compare-speed')).not.toBeNull();
    const oneX = container?.querySelector('[aria-label="1× speed"]') as HTMLElement | null;
    expect(oneX?.getAttribute('aria-checked')).toBe('true');
  });

  it('changes and persists the speed when a segment is clicked (P12)', () => {
    render(<CompareShell leftId="left-unknown" rightId="right-unknown" />);
    const twoX = container?.querySelector('[aria-label="2× speed"]') as HTMLButtonElement | null;
    act(() => {
      twoX?.click();
    });
    expect(
      (container?.querySelector('[aria-label="2× speed"]') as HTMLElement | null)?.getAttribute(
        'aria-checked',
      ),
    ).toBe('true');
    expect(window.localStorage.getItem('nl_compare_speed')).toBe('2');
  });
});
