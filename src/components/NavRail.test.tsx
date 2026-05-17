/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavRail } from './NavRail';

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

describe('NavRail', () => {
  it('renders four primary items plus the bottom help item', () => {
    act(() => {
      root?.render(<NavRail view="simulator" onSelectView={vi.fn()} />);
    });

    const labels = Array.from(container?.querySelectorAll('[data-netlab-rail-item]') ?? []).map(
      (item) => item.getAttribute('aria-label'),
    );

    expect(labels).toEqual(['Browse', 'Run', 'Sandbox', 'Settings', 'Help']);
  });

  it('marks the active item with aria-current and a cyan rail accent', () => {
    act(() => {
      root?.render(<NavRail view="simulator" onSelectView={vi.fn()} />);
    });

    const active = container?.querySelector('[aria-current="page"]') as HTMLElement | null;
    expect(active?.getAttribute('aria-label')).toBe('Run');
    expect(active?.style.borderLeftColor).toBe('var(--netlab-accent-cyan)');
  });

  it('calls onSelectView when Browse is clicked', () => {
    const onSelectView = vi.fn();
    act(() => {
      root?.render(<NavRail view="simulator" onSelectView={onSelectView} />);
    });

    const browse = container?.querySelector('[aria-label="Browse"]') as HTMLButtonElement | null;
    act(() => {
      browse?.click();
    });

    expect(onSelectView).toHaveBeenCalledWith('gallery');
  });

  it('calls onOpenHelp when the bottom Help item is clicked', () => {
    const onOpenHelp = vi.fn();
    act(() => {
      root?.render(<NavRail view="simulator" onSelectView={vi.fn()} onOpenHelp={onOpenHelp} />);
    });

    act(() => {
      (container?.querySelector('[aria-label="Help"]') as HTMLButtonElement | null)?.click();
    });

    expect(onOpenHelp).toHaveBeenCalledOnce();
  });

  it('keeps disabled placeholder items unfocusable and inert', () => {
    const onOpenSandbox = vi.fn();
    const onOpenSettings = vi.fn();
    act(() => {
      root?.render(
        <NavRail
          view="simulator"
          onSelectView={vi.fn()}
          onOpenSandbox={onOpenSandbox}
          onOpenSettings={onOpenSettings}
        />,
      );
    });

    const sandbox = container?.querySelector('[aria-label="Sandbox"]') as HTMLButtonElement | null;
    const settings = container?.querySelector(
      '[aria-label="Settings"]',
    ) as HTMLButtonElement | null;

    expect(sandbox?.disabled).toBe(true);
    expect(sandbox?.tabIndex).toBe(-1);
    expect(settings?.disabled).toBe(true);
    expect(settings?.tabIndex).toBe(-1);

    act(() => {
      sandbox?.click();
      settings?.click();
    });

    expect(onOpenSandbox).not.toHaveBeenCalled();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });
});
