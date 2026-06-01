/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AreaCluster } from './AreaCluster';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }
  if (!root) root = createRoot(container);
  act(() => root?.render(ui));
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  if (container) {
    container.remove();
    container = null;
  }
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

describe('AreaCluster', () => {
  it('renders the area name and a pluralized host count', () => {
    render(<AreaCluster name="DMZ" hostCount={12} />);
    const text = container?.textContent ?? '';
    expect(text).toContain('DMZ');
    expect(text).toContain('12 hosts');
    expect(text).toContain('collapsed');
  });

  it('uses the singular for one host', () => {
    render(<AreaCluster name="Edge" hostCount={1} />);
    expect(container?.textContent).toContain('1 host ');
  });

  it('calls onExpand when clicked', () => {
    const onExpand = vi.fn();
    render(<AreaCluster name="DMZ" hostCount={3} onExpand={onExpand} />);
    act(() =>
      container
        ?.querySelector('[data-testid="area-cluster"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(onExpand).toHaveBeenCalledOnce();
  });
});
