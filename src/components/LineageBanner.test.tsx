/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sandbox } from '../sandbox/fork';
import { LineageBanner } from './LineageBanner';

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

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function makeSandbox(diff: Partial<Sandbox['diff']> = {}): Sandbox {
  return {
    id: 'sb_test',
    forkedFrom: 'ospf-convergence',
    forkedAtStep: 4,
    diff: { nodes: 0, edges: 0, routes: 0, acls: 0, ...diff },
    createdAt: '2026-05-24T00:00:00Z',
  };
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
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

describe('LineageBanner', () => {
  it('shows the origin, fork step, and non-zero diff parts', () => {
    render(<LineageBanner sandbox={makeSandbox({ edges: 2 })} originTitle="OSPF Preferred Path" />);
    const text = q('lineage-banner')?.textContent ?? '';
    expect(text).toContain('OSPF Preferred Path');
    expect(text).toContain('step 4');
    expect(q('lineage-diff')?.textContent ?? '').toContain('+2 edges');
  });

  it('shows "no edits yet" when the diff is empty', () => {
    render(<LineageBanner sandbox={makeSandbox()} />);
    expect(q('lineage-diff')?.textContent ?? '').toContain('no edits yet');
  });

  it('resets immediately on a single click when there are no edits to lose', () => {
    const onReset = vi.fn();
    const onCompare = vi.fn();
    const onClose = vi.fn();
    render(
      <LineageBanner
        sandbox={makeSandbox()}
        onReset={onReset}
        onCompare={onCompare}
        onClose={onClose}
      />,
    );
    click(q('lineage-reset') as HTMLElement);
    click(q('lineage-compare') as HTMLElement);
    click(q('lineage-close') as HTMLElement);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onCompare).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires a confirm click before discarding when edits exist (P7)', () => {
    const onReset = vi.fn();
    render(<LineageBanner sandbox={makeSandbox({ edges: 2, acls: 1 })} onReset={onReset} />);

    const reset = q('lineage-reset') as HTMLElement;
    expect(reset.textContent).toBe('reset to origin');

    // First click arms the confirm state; it must NOT reset yet.
    click(reset);
    expect(onReset).not.toHaveBeenCalled();
    expect(q('lineage-reset')?.getAttribute('data-confirming')).toBe('true');
    expect(q('lineage-reset')?.textContent).toBe('discard 3 edits?');

    // Second click within the window commits the reset and clears confirm.
    click(q('lineage-reset') as HTMLElement);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(q('lineage-reset')?.getAttribute('data-confirming')).toBeNull();
  });

  it('auto-clears the confirm state after the timeout (P7)', () => {
    vi.useFakeTimers();
    try {
      const onReset = vi.fn();
      render(<LineageBanner sandbox={makeSandbox({ edges: 1 })} onReset={onReset} />);
      click(q('lineage-reset') as HTMLElement);
      expect(q('lineage-reset')?.textContent).toBe('discard 1 edit?');

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(q('lineage-reset')?.textContent).toBe('reset to origin');
      expect(onReset).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('omits action buttons when no handlers are given', () => {
    render(<LineageBanner sandbox={makeSandbox()} />);
    expect(q('lineage-reset')).toBeNull();
    expect(q('lineage-compare')).toBeNull();
    expect(q('lineage-close')).toBeNull();
  });
});
