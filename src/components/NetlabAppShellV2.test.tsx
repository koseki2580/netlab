/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetlabAppShellV2 } from './NetlabAppShellV2';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

class MockResizeObserver implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
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
  vi.unstubAllGlobals();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('NetlabAppShellV2', () => {
  it('renders a single-row command bar instead of the legacy four tool zones', () => {
    act(() => {
      root?.render(
        <NetlabAppShellV2
          scenarioId="ospf-convergence"
          scenarioLayer="L3"
          isPlaying={false}
          step={2}
          totalSteps={8}
          status={{ label: 'ready', tone: 'ready' }}
        >
          <div data-testid="body">canvas</div>
        </NetlabAppShellV2>,
      );
    });

    expect(container?.querySelector('[data-netlab-command-bar]')).not.toBeNull();
    expect(container?.querySelector('[data-tool-group]')).toBeNull();
    expect(container?.textContent).toContain('scenario://ospf-convergence');
    expect(container?.querySelector('[data-testid="body"]')?.textContent).toBe('canvas');
  });

  it('preserves the hint and statusLine slots in the canvas frame', () => {
    act(() => {
      root?.render(
        <NetlabAppShellV2
          scenarioId="ospf"
          isPlaying={false}
          step={0}
          hint="Tip · inspect R1"
          statusLine={<div data-testid="status-line">status line</div>}
        >
          body
        </NetlabAppShellV2>,
      );
    });

    expect(container?.querySelector('[data-netlab-shell-hint]')?.textContent).toContain(
      'inspect R1',
    );
    expect(container?.querySelector('[data-netlab-shell-status-line]')?.textContent).toContain(
      'status line',
    );
  });
});
