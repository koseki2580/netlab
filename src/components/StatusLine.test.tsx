/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
});
