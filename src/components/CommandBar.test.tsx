/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandBar } from './CommandBar';

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let resizeCallback: ResizeObserverCallback | null = null;

class MockResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function resizeCommandBar(width: number) {
  const bar = container?.querySelector('[data-netlab-command-bar]') as HTMLElement | null;
  const callback = resizeCallback;
  if (!bar || !callback) return;
  act(() => {
    callback(
      [
        {
          target: bar,
          contentRect: { width } as DOMRectReadOnly,
        } as unknown as ResizeObserverEntry,
      ],
      new MockResizeObserver(callback),
    );
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  resizeCallback = null;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
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

describe('CommandBar', () => {
  it('renders scenario identity, run controls, step counter, status, palette, more, and export', () => {
    act(() => {
      root?.render(
        <CommandBar
          scenarioId="ospf-convergence"
          scenarioLayer="L3"
          isPlaying={false}
          step={2}
          totalSteps={8}
          status={{ label: 'ready', tone: 'ready' }}
        />,
      );
    });

    expect(container?.textContent).toContain('scenario://ospf-convergence');
    expect(container?.textContent).toContain('L3');
    expect(container?.querySelector('[aria-label="Play"]')).not.toBeNull();
    expect(container?.querySelector('[aria-label="Step"]')).not.toBeNull();
    expect(container?.querySelector('[aria-label="Reset"]')).not.toBeNull();
    expect(container?.textContent).toContain('03 / 08');
    expect(container?.textContent).toContain('ready');
    expect(container?.querySelector('[aria-label="Open command palette"]')).not.toBeNull();
    expect(container?.querySelector('[aria-label="More actions"]')).not.toBeNull();
    expect(container?.querySelector('[aria-label="Export PCAP"]')).not.toBeNull();
  });

  it('keeps the command bar to one non-wrapping row', () => {
    act(() => {
      root?.render(<CommandBar scenarioId="ospf" isPlaying={false} step={0} />);
    });

    const bar = container?.querySelector('[data-netlab-command-bar]') as HTMLElement | null;
    expect(bar?.style.flexWrap).toBe('nowrap');
  });

  it('dispatches play and pause through the visible play-pause button', () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();

    act(() => {
      root?.render(<CommandBar scenarioId="ospf" isPlaying={false} step={0} onPlay={onPlay} />);
    });
    act(() => {
      (container?.querySelector('[aria-label="Play"]') as HTMLButtonElement | null)?.click();
    });
    expect(onPlay).toHaveBeenCalledOnce();

    act(() => {
      root?.render(
        <CommandBar scenarioId="ospf" isPlaying step={0} onPlay={onPlay} onPause={onPause} />,
      );
    });
    expect(container?.querySelector('[aria-label="Pause"]')?.textContent).toContain('⏸');
    act(() => {
      (container?.querySelector('[aria-label="Pause"]') as HTMLButtonElement | null)?.click();
    });
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('uses ResizeObserver breakpoints to hide the scenario subline at 1000px', () => {
    act(() => {
      root?.render(
        <CommandBar
          scenarioId="ospf-convergence"
          scenarioLayer="L3"
          isPlaying={false}
          step={2}
          totalSteps={8}
          status={{ label: 'ready', tone: 'ready' }}
        />,
      );
    });

    resizeCommandBar(1000);

    expect(container?.querySelector('[data-netlab-command-bar-subline]')).toBeNull();
    expect(container?.textContent).toContain('03');
    expect(container?.querySelector('[data-netlab-command-bar-total]')).toBeNull();
    expect(container?.textContent).toContain('ready');
  });

  it('collapses the status label to a dot below 800px', () => {
    act(() => {
      root?.render(
        <CommandBar
          scenarioId="ospf"
          isPlaying={false}
          step={0}
          status={{ label: 'running', tone: 'running' }}
        />,
      );
    });

    resizeCommandBar(760);

    expect(container?.querySelector('[data-netlab-command-bar-status-label]')).toBeNull();
    expect(container?.querySelector('[data-netlab-command-bar-status-dot]')).not.toBeNull();
  });

  it('reveals overflow actions from the More menu', () => {
    act(() => {
      root?.render(<CommandBar scenarioId="ospf" isPlaying={false} step={0} />);
    });

    act(() => {
      (
        container?.querySelector('[aria-label="More actions"]') as HTMLButtonElement | null
      )?.click();
    });

    expect(container?.textContent).toContain('Topology');
    expect(container?.textContent).toContain('Inspect');
    expect(container?.textContent).toContain('Sandbox');
  });
});
