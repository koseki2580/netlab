/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecommendedOrder, type RecommendedOrderItem } from './RecommendedOrder';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

const ITEMS: RecommendedOrderItem[] = [
  { id: 'a', title: 'A', desc: 'first', minutes: 6, step: 1, state: 'done', href: '/a' },
  { id: 'b', title: 'B', desc: 'second', minutes: 10, step: 2, state: 'current', href: '/b' },
  { id: 'c', title: 'C', desc: 'third', minutes: 15, step: 3, state: 'next', href: '/c' },
];

describe('RecommendedOrder', () => {
  it('renders one row per item with stable list semantics', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <RecommendedOrder items={ITEMS} />
        </MemoryRouter>,
      );
    });
    const rows = container?.querySelectorAll('[role="listitem"]');
    expect(rows?.length).toBe(3);
    expect(container?.textContent).toContain('A');
    expect(container?.textContent).toContain('B');
    expect(container?.textContent).toContain('C');
  });

  it('shows a check mark for done rows and the step number otherwise', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <RecommendedOrder items={ITEMS} />
        </MemoryRouter>,
      );
    });
    const rows = container?.querySelectorAll('[role="listitem"]') ?? [];
    expect(rows[0]?.textContent).toContain('✓');
    expect(rows[1]?.textContent).toContain('2');
    expect(rows[2]?.textContent).toContain('3');
  });

  it('uses "Review →" for done rows and "Open →" otherwise', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <RecommendedOrder items={ITEMS} />
        </MemoryRouter>,
      );
    });
    const rows = container?.querySelectorAll('[role="listitem"]') ?? [];
    expect(rows[0]?.textContent).toContain('Review →');
    expect(rows[1]?.textContent).toContain('Open →');
  });

  it('calls onOpen when a non-modified click is intercepted', () => {
    const onOpen = vi.fn();
    act(() => {
      root?.render(
        <MemoryRouter>
          <RecommendedOrder items={ITEMS} onOpen={onOpen} />
        </MemoryRouter>,
      );
    });
    const second = container?.querySelectorAll('[role="listitem"]')[1] as HTMLAnchorElement;
    act(() => {
      second.click();
    });
    expect(onOpen).toHaveBeenCalledWith('b', '/b');
  });
});
