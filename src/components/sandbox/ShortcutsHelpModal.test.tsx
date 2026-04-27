/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shortcutRegistry } from '../../sandbox/shortcuts/registry';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
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

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  shortcutRegistry._reset();
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
  shortcutRegistry._reset();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();
});

describe('ShortcutsHelpModal', () => {
  it('renders with role=dialog and aria-modal', () => {
    render(<ShortcutsHelpModal onClose={vi.fn()} />);
    const dialog = container?.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('labels the dialog with a heading', () => {
    render(<ShortcutsHelpModal onClose={vi.fn()} />);
    expect(container?.querySelector('#shortcuts-modal-heading')?.textContent).toBe(
      'Keyboard shortcuts',
    );
    const dialog = container?.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('shortcuts-modal-heading');
  });

  it('renders a row for each registered shortcut', () => {
    shortcutRegistry.register({ key: '?', description: 'Help', action: vi.fn() });
    shortcutRegistry.register({ key: 'Escape', description: 'Close', action: vi.fn() });
    render(<ShortcutsHelpModal onClose={vi.fn()} />);
    const rows = container?.querySelectorAll('tbody tr');
    expect(rows?.length).toBe(2);
  });

  it('shows key and description text in each row', () => {
    shortcutRegistry.register({
      key: 'Shift+S',
      description: 'Toggle sandbox panel',
      action: vi.fn(),
    });
    render(<ShortcutsHelpModal onClose={vi.fn()} />);
    const text = container?.querySelector('tbody')?.textContent ?? '';
    expect(text).toContain('Shift+S');
    expect(text).toContain('Toggle sandbox panel');
  });

  it('shows empty table body when no shortcuts are registered', () => {
    render(<ShortcutsHelpModal onClose={vi.fn()} />);
    const rows = container?.querySelectorAll('tbody tr');
    expect(rows?.length).toBe(0);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelpModal onClose={onClose} />);
    const btn = container?.querySelector<HTMLButtonElement>('[aria-label="Close shortcuts help"]');
    act(() => {
      btn?.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed inside the dialog', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelpModal onClose={onClose} />);
    const dialog = container?.querySelector<HTMLElement>('[role="dialog"]');
    act(() => {
      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelpModal onClose={onClose} />);
    const backdrop = container?.querySelector<HTMLElement>('[role="none"]');
    act(() => {
      backdrop?.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the dialog itself is clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutsHelpModal onClose={onClose} />);
    const dialog = container?.querySelector<HTMLElement>('[role="dialog"]');
    act(() => {
      dialog?.click();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses the dialog element on mount', () => {
    render(<ShortcutsHelpModal onClose={vi.fn()} />);
    const dialog = container?.querySelector<HTMLElement>('[role="dialog"]');
    expect(document.activeElement).toBe(dialog);
  });

  it('has a table with column headers Key and Action', () => {
    render(<ShortcutsHelpModal onClose={vi.fn()} />);
    const headers = Array.from(container?.querySelectorAll('th') ?? []).map((h) => h.textContent);
    expect(headers).toContain('Key');
    expect(headers).toContain('Action');
  });
});
