/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusLine } from './StatusLine';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

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

describe('StatusLine', () => {
  it('renders the scenario id segment with a `scenario://` prefix', () => {
    render(<StatusLine scenarioId="ospf-convergence" />);
    expect(container?.textContent ?? '').toContain('scenario://ospf-convergence');
  });

  it('falls back to a placeholder when no scenario id is provided', () => {
    render(<StatusLine />);
    // The leading segment should still render — the bar is always visible.
    expect(container?.querySelector('[data-netlab-status-line]')).not.toBeNull();
  });

  it('shows the step counter as `step (i+1)/total` only when both numbers are present', () => {
    render(<StatusLine step={2} totalSteps={8} />);
    expect(container?.textContent ?? '').toContain('step 3/8');

    render(<StatusLine step={2} />);
    expect(container?.textContent ?? '').not.toMatch(/step \d+\//);
  });

  it('renders zero counts by default', () => {
    render(<StatusLine />);
    const text = container?.textContent ?? '';
    expect(text).toMatch(/pkts\s*0/);
    expect(text).toMatch(/drops\s*0/);
    expect(text).toMatch(/arp\s*0/);
  });

  it('reflects supplied counts', () => {
    render(<StatusLine packetsCount={12} dropsCount={3} arpCount={4} />);
    const text = container?.textContent ?? '';
    expect(text).toMatch(/pkts\s*12/);
    expect(text).toMatch(/drops\s*3/);
    expect(text).toMatch(/arp\s*4/);
  });

  it('renders the selected id when provided, or `—` otherwise', () => {
    render(<StatusLine selectedId="r1" />);
    expect(container?.textContent ?? '').toContain('r1 selected');

    render(<StatusLine />);
    expect(container?.textContent ?? '').toContain('— selected');
  });

  it('renders the palette/help affordances as inert muted text when no handlers are wired', () => {
    render(<StatusLine />);
    // No buttons advertised when there is nothing to do (P2).
    expect(container?.querySelector('[aria-label="Open command palette"]')).toBeNull();
    expect(container?.querySelector('[aria-label="Open help"]')).toBeNull();
    expect(container?.textContent ?? '').toContain('? help');
  });

  it('makes `drops N` a button only when a handler is wired and there are drops', () => {
    const onJumpToDrop = vi.fn();

    // No drops → plain text even with a handler.
    render(<StatusLine dropsCount={0} onJumpToDrop={onJumpToDrop} />);
    expect(container?.querySelector('[aria-label="Jump to first dropped packet"]')).toBeNull();

    // Drops but no handler → plain text.
    render(<StatusLine dropsCount={3} />);
    expect(container?.querySelector('[aria-label="Jump to first dropped packet"]')).toBeNull();

    // Drops + handler → real button that fires.
    render(<StatusLine dropsCount={3} onJumpToDrop={onJumpToDrop} />);
    const button = container?.querySelector(
      '[aria-label="Jump to first dropped packet"]',
    ) as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('3');
    act(() => button?.click());
    expect(onJumpToDrop).toHaveBeenCalledOnce();
  });

  it('makes ⌘K / ? help real buttons that fire their handlers when wired (P2)', () => {
    const onOpenPalette = vi.fn();
    const onOpenHelp = vi.fn();
    render(<StatusLine onOpenPalette={onOpenPalette} onOpenHelp={onOpenHelp} />);

    const palette = container?.querySelector(
      '[aria-label="Open command palette"]',
    ) as HTMLButtonElement | null;
    const help = container?.querySelector('[aria-label="Open help"]') as HTMLButtonElement | null;
    expect(palette).not.toBeNull();
    expect(help).not.toBeNull();

    act(() => {
      palette?.click();
      help?.click();
    });

    expect(onOpenPalette).toHaveBeenCalledOnce();
    expect(onOpenHelp).toHaveBeenCalledOnce();
  });
});
