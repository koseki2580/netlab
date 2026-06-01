/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegendPanel } from './LegendPanel';

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

describe('LegendPanel', () => {
  it('starts collapsed and expands to list node and marker labels', () => {
    render(<LegendPanel />);
    expect(q('legend-toggle')).not.toBeNull();
    expect(q('legend-body')).toBeNull();
    expect(q('legend-toggle')?.getAttribute('aria-expanded')).toBe('false');

    click(q('legend-toggle') as HTMLElement);

    const body = q('legend-body');
    expect(body).not.toBeNull();
    const text = body?.textContent ?? '';
    for (const kind of ['router', 'switch', 'client', 'server']) {
      expect(text).toContain(kind);
    }
    expect(text).toContain('dropped');
    expect(text).toContain('ARP');
    expect(window.localStorage.getItem('nl_a11y_legend')).toBe('1');
  });

  it('lists the packet-edge kinds with their color+dash+cap encoding', () => {
    render(<LegendPanel />);
    click(q('legend-toggle') as HTMLElement);
    const text = q('legend-body')?.textContent ?? '';
    expect(text).toContain('packet edges');
    expect(text).toContain('ICMP request');
    expect(text).toContain('ICMP reply');
    // Cap names surface as the encoding hint for dashed kinds.
    expect(text).toContain('diamond');
  });

  it('points the toggle arrow down when closed and up when open (P6)', () => {
    render(<LegendPanel />);
    // Closed: ▾ (expandable downward).
    expect(q('legend-toggle')?.textContent ?? '').toContain('▾');

    click(q('legend-toggle') as HTMLElement);
    // Open: ▴ (collapsible upward).
    expect(q('legend-toggle')?.textContent ?? '').toContain('▴');
  });

  it('persists the open state and reopens from localStorage', () => {
    window.localStorage.setItem('nl_a11y_legend', '1');
    render(<LegendPanel />);
    expect(q('legend-body')).not.toBeNull();

    click(q('legend-toggle') as HTMLElement);
    expect(q('legend-body')).toBeNull();
    expect(window.localStorage.getItem('nl_a11y_legend')).toBe('0');
  });
});
