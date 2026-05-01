/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LargeTopologyWarning } from './LargeTopologyWarning';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnv = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

function render(ui: React.ReactElement) {
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) root = createRoot(container);
  act(() => root?.render(ui));
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  actEnv.IS_REACT_ACT_ENVIRONMENT = false;
  if (container) {
    container.remove();
    container = null;
  }
});

describe('LargeTopologyWarning', () => {
  it('renders nothing below one hundred nodes', () => {
    render(<LargeTopologyWarning nodeCount={99} fastMode={false} onEnableFastMode={vi.fn()} />);

    expect(container?.textContent).toBe('');
  });

  it('renders a yellow warning at one hundred nodes', () => {
    render(<LargeTopologyWarning nodeCount={100} fastMode={false} onEnableFastMode={vi.fn()} />);

    expect(container?.textContent).toContain('100 nodes');
    expect(container?.querySelector('[data-severity="warning"]')).not.toBeNull();
  });

  it('renders a red warning at two hundred nodes', () => {
    render(<LargeTopologyWarning nodeCount={200} fastMode={false} onEnableFastMode={vi.fn()} />);

    expect(container?.textContent).toContain('exceeds the tested bound');
    expect(container?.querySelector('[data-severity="critical"]')).not.toBeNull();
  });

  it('can request Fast mode', () => {
    const onEnableFastMode = vi.fn();
    render(
      <LargeTopologyWarning nodeCount={100} fastMode={false} onEnableFastMode={onEnableFastMode} />,
    );

    act(() => {
      container?.querySelector<HTMLButtonElement>('[aria-label="Use fast mode"]')?.click();
    });

    expect(onEnableFastMode).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed for the current render session', () => {
    render(<LargeTopologyWarning nodeCount={100} fastMode={false} onEnableFastMode={vi.fn()} />);

    act(() => {
      container
        ?.querySelector<HTMLButtonElement>('[aria-label="Dismiss large topology warning"]')
        ?.click();
    });

    expect(container?.textContent).toBe('');
  });
});
