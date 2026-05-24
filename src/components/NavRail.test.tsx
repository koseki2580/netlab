/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavRail, type NavRailItem } from './NavRail';

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

function items(overrides: Partial<NavRailItem> = {}): NavRailItem[] {
  return [
    { id: 'gallery', label: 'Browse', icon: '⊞', active: false, onClick: vi.fn() },
    { id: 'simulator', label: 'Run', icon: '▶', active: true, onClick: vi.fn(), ...overrides },
  ];
}

describe('NavRail', () => {
  it('renders exactly the caller-supplied items plus the bottom help item', () => {
    act(() => {
      root?.render(<NavRail items={items()} onOpenHelp={vi.fn()} />);
    });

    const labels = Array.from(container?.querySelectorAll('[data-netlab-rail-item]') ?? []).map(
      (item) => item.getAttribute('aria-label'),
    );

    // No "Sandbox" / "Settings" placeholders — the rail ships no disabled defaults (P4).
    expect(labels).toEqual(['Browse', 'Run', 'Help']);
  });

  it('marks the active item with aria-current and a cyan rail accent', () => {
    act(() => {
      root?.render(<NavRail items={items()} onOpenHelp={vi.fn()} />);
    });

    const active = container?.querySelector('[aria-current="page"]') as HTMLElement | null;
    expect(active?.getAttribute('aria-label')).toBe('Run');
    expect(active?.style.borderLeftColor).toBe('var(--netlab-accent-cyan)');
  });

  it('calls the item onClick when a nav item is clicked', () => {
    const onClick = vi.fn();
    const list: NavRailItem[] = [{ id: 'gallery', label: 'Browse', icon: '⊞', onClick }];
    act(() => {
      root?.render(<NavRail items={list} />);
    });

    const browse = container?.querySelector('[aria-label="Browse"]') as HTMLButtonElement | null;
    act(() => {
      browse?.click();
    });

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onOpenBrand when the brand mark is clicked', () => {
    const onOpenBrand = vi.fn();
    act(() => {
      root?.render(<NavRail items={items()} onOpenBrand={onOpenBrand} />);
    });

    act(() => {
      (
        container?.querySelector('[aria-label="Netlab gallery"]') as HTMLButtonElement | null
      )?.click();
    });

    expect(onOpenBrand).toHaveBeenCalledOnce();
  });

  it('calls onOpenHelp when the bottom Help item is clicked', () => {
    const onOpenHelp = vi.fn();
    act(() => {
      root?.render(<NavRail items={items()} onOpenHelp={onOpenHelp} />);
    });

    act(() => {
      (container?.querySelector('[aria-label="Help"]') as HTMLButtonElement | null)?.click();
    });

    expect(onOpenHelp).toHaveBeenCalledOnce();
  });

  it('keeps a runtime-disabled item unfocusable and inert', () => {
    const onClick = vi.fn();
    const list: NavRailItem[] = [
      { id: 'compare', label: 'Compare', icon: '⇄', disabled: true, onClick },
    ];
    act(() => {
      root?.render(<NavRail items={list} />);
    });

    const compare = container?.querySelector('[aria-label="Compare"]') as HTMLButtonElement | null;
    expect(compare?.disabled).toBe(true);
    expect(compare?.tabIndex).toBe(-1);

    act(() => {
      compare?.click();
    });

    expect(onClick).not.toHaveBeenCalled();
  });
});
