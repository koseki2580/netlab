/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolGroup, ToolGroupButton } from './ToolGroup';

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

describe('ToolGroup', () => {
  it('renders the title eyebrow above the segmented control and exposes a group role', () => {
    act(() => {
      root?.render(
        <ToolGroup title="RUN" accent="var(--netlab-accent-green)">
          <ToolGroupButton>Play</ToolGroupButton>
        </ToolGroup>,
      );
    });
    expect(container?.textContent).toContain('RUN');
    const group = container?.querySelector('[role="group"]') as HTMLElement | null;
    expect(group).not.toBeNull();
    expect(group?.getAttribute('aria-label')).toBe('RUN');
  });

  it('encodes the accent color in the inset shadow', () => {
    act(() => {
      root?.render(
        <ToolGroup title="INSPECT" accent="var(--netlab-accent-cyan)">
          <ToolGroupButton>Packets</ToolGroupButton>
        </ToolGroup>,
      );
    });
    const group = container?.querySelector('[role="group"]') as HTMLElement | null;
    // boxShadow may be normalized by JSDOM; just assert the accent ref is present.
    expect(group?.style.boxShadow).toContain('var(--netlab-accent-cyan)');
  });
});

describe('ToolGroupButton', () => {
  it('reflects active state via aria-pressed', () => {
    act(() => {
      root?.render(
        <ToolGroup title="RUN" accent="var(--netlab-accent-green)">
          <ToolGroupButton active>Play</ToolGroupButton>
          <ToolGroupButton>Pause</ToolGroupButton>
        </ToolGroup>,
      );
    });
    const buttons = container?.querySelectorAll('button') ?? [];
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('false');
  });

  it('fires onClick when clicked', () => {
    const handler = vi.fn();
    act(() => {
      root?.render(
        <ToolGroup title="RUN" accent="var(--netlab-accent-green)">
          <ToolGroupButton onClick={handler}>Play</ToolGroupButton>
        </ToolGroup>,
      );
    });
    const btn = container?.querySelector('button');
    act(() => {
      btn?.click();
    });
    expect(handler).toHaveBeenCalledOnce();
  });
});
