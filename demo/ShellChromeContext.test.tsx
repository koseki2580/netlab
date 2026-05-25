/* @vitest-environment jsdom */

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DemoShell from './DemoShell';
import { useShellChrome } from './ShellChromeContext';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function press(key: string, init: KeyboardEventInit = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });
}

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

describe('DemoShell command palette chrome', () => {
  it('opens the command palette with the global keymap and navigates through a command', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/routing/ospf-convergence']}>
          <DemoShell title="Example" desc="Shared shell">
            <div>body</div>
          </DemoShell>
        </MemoryRouter>,
      );
    });

    press('k', { metaKey: true });

    const input = container?.querySelector(
      'input[aria-label="Command palette search"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    act(() => {
      input!.value = 'gallery';
      input!.dispatchEvent(new Event('input', { bubbles: true }));
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(container?.querySelector('[data-netlab-command-palette]')).toBeNull();
  });

  it('opens the keyboard help overlay from the rail help button', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/routing/ospf-convergence']}>
          <DemoShell title="Example" desc="Shared shell">
            <div>body</div>
          </DemoShell>
        </MemoryRouter>,
      );
    });

    act(() => {
      (container?.querySelector('[aria-label="Help"]') as HTMLButtonElement | null)?.click();
    });

    const overlay = container?.querySelector('[data-testid="keyboard-help-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('⌘K');
    expect(overlay?.textContent).toContain('Open command palette');
  });

  it('opens the keyboard help overlay with the global ? key and closes it with Escape', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/routing/ospf-convergence']}>
          <DemoShell title="Example" desc="Shared shell">
            <div>body</div>
          </DemoShell>
        </MemoryRouter>,
      );
    });

    press('?');
    expect(container?.querySelector('[data-testid="keyboard-help-overlay"]')).not.toBeNull();

    press('Escape');
    expect(container?.querySelector('[data-testid="keyboard-help-overlay"]')).toBeNull();
  });

  it('lets the brief full card preempt the global ? key', () => {
    // Stand in for an open pre-flight brief: the guard keys off this testid.
    const brief = document.createElement('div');
    brief.setAttribute('data-testid', 'preflight-fullcard');
    document.body.appendChild(brief);

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/routing/ospf-convergence']}>
          <DemoShell title="Example" desc="Shared shell">
            <div>body</div>
          </DemoShell>
        </MemoryRouter>,
      );
    });

    press('?');
    expect(container?.querySelector('[data-testid="keyboard-help-overlay"]')).toBeNull();

    brief.remove();
  });

  it('includes palette items registered by the active simulator', () => {
    function RegistersPaletteItem() {
      const shellChrome = useShellChrome();

      useEffect(
        () =>
          shellChrome.registerPaletteItems([
            {
              id: 'trace-hop:demo:2',
              label: 'Hop 02 forward R2',
              subtitle: 'r1 -> r2',
              group: 'Current trace',
              keywords: ['ospf', 'r2'],
              onSelect: () => shellChrome.closeShellOverlays(),
            },
          ]),
        [shellChrome],
      );

      return <div>body</div>;
    }

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/routing/ospf-convergence']}>
          <DemoShell title="Example" desc="Shared shell">
            <RegistersPaletteItem />
          </DemoShell>
        </MemoryRouter>,
      );
    });

    press('k', { metaKey: true });

    const input = container?.querySelector(
      'input[aria-label="Command palette search"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    act(() => {
      input!.value = 'r2';
      input!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container?.querySelector('[data-netlab-command-palette]')?.textContent).toContain(
      'Hop 02 forward R2',
    );
  });
});
