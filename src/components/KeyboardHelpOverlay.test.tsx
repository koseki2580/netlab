/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyboardHelpOverlay } from './KeyboardHelpOverlay';

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
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('KeyboardHelpOverlay', () => {
  it('renders nothing when closed', () => {
    act(() => root?.render(<KeyboardHelpOverlay open={false} onClose={vi.fn()} />));
    expect(container?.querySelector('[data-testid="keyboard-help-overlay"]')).toBeNull();
  });

  it('renders shortcuts grouped by category when open', () => {
    act(() => root?.render(<KeyboardHelpOverlay open onClose={vi.fn()} />));
    const overlay = container?.querySelector('[data-testid="keyboard-help-overlay"]');
    expect(overlay).not.toBeNull();
    // category eyebrows present
    expect(overlay?.textContent).toContain('Playback');
    expect(overlay?.textContent).toContain('Navigation');
    // a representative shortcut renders its key + description
    expect(overlay?.textContent).toContain('Play / pause');
    expect(overlay?.textContent).toContain('Open command palette');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    act(() => root?.render(<KeyboardHelpOverlay open onClose={onClose} />));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on scrim click but not on dialog click', () => {
    const onClose = vi.fn();
    act(() => root?.render(<KeyboardHelpOverlay open onClose={onClose} />));
    const scrim = container?.querySelector('[data-testid="keyboard-help-overlay"]') as HTMLElement;
    const dialog = container?.querySelector('[role="dialog"]') as HTMLElement;

    act(() => dialog.click());
    expect(onClose).not.toHaveBeenCalled();

    act(() => scrim.click());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('filters to global + scope when a scope is given', () => {
    act(() => root?.render(<KeyboardHelpOverlay open onClose={vi.fn()} scope="simulator" />));
    const overlay = container?.querySelector('[data-testid="keyboard-help-overlay"]');
    // simulator + global only — compare-speed shortcut should be hidden
    expect(overlay?.textContent).not.toContain('compare speed');
    expect(overlay?.textContent).toContain('Open command palette');
  });
});
