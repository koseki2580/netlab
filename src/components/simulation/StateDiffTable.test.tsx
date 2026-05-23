/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StepSnapshots } from '../../simulation/snapshots';
import { StateDiffTable } from './StateDiffTable';

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
  act(() => {
    root?.render(ui);
  });
}

function q(testid: string): HTMLElement | null {
  return container?.querySelector(`[data-testid="${testid}"]`) ?? null;
}

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

const ARP_SNAPSHOTS: StepSnapshots = new Map([
  [0, { r1: { routes: [], arp: [] } }],
  [1, { r1: { routes: [], arp: [{ ip: '10.0.0.2', mac: 'aa' }] } }],
  [
    2,
    {
      r1: {
        routes: [],
        arp: [
          { ip: '10.0.0.2', mac: 'aa' },
          { ip: '10.0.0.3', mac: 'bb' },
        ],
      },
    },
  ],
]);

const ROUTE_SNAPSHOTS: StepSnapshots = new Map([
  [
    0,
    {
      r1: {
        routes: [{ dst: '10.4.0.0/24', via: 'r2', proto: 'ospf', metric: 20, ad: 110 }],
        arp: [],
      },
    },
  ],
  [
    1,
    {
      r1: {
        routes: [{ dst: '10.4.0.0/24', via: 'r2', proto: 'ospf', metric: 30, ad: 110 }],
        arp: [],
      },
    },
  ],
]);

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

describe('StateDiffTable', () => {
  it('shows an added ARP row in diff mode', () => {
    render(<StateDiffTable snapshots={ARP_SNAPSHOTS} nodeId="r1" stepIndex={1} tableKind="arp" />);
    expect(q('state-diff-table')).not.toBeNull();
    const addedRow = container?.querySelector('tr[data-status="added"]');
    expect(addedRow).not.toBeNull();
    expect(addedRow?.textContent ?? '').toContain('10.0.0.2');
  });

  it('switches between now / diff / history modes', () => {
    render(<StateDiffTable snapshots={ARP_SNAPSHOTS} nodeId="r1" stepIndex={2} tableKind="arp" />);
    // diff (default): the second binding is added vs step 1.
    expect(container?.querySelector('tr[data-status="added"]')).not.toBeNull();

    click(q('mode-now') as HTMLElement);
    // now: both current rows shown as unchanged.
    const unchanged = container?.querySelectorAll('tr[data-status="unchanged"]');
    expect(unchanged?.length).toBe(2);
    expect(q('state-diff-heatmap')).toBeNull();

    click(q('mode-history') as HTMLElement);
    expect(q('state-diff-heatmap')).not.toBeNull();
    // the current step's column is outlined.
    expect(q('heatmap-cell-current')).not.toBeNull();
  });

  it('renders a changed route metric as `from → to`', () => {
    render(
      <StateDiffTable snapshots={ROUTE_SNAPSHOTS} nodeId="r1" stepIndex={1} tableKind="routes" />,
    );
    const changed = container?.querySelector('tr[data-status="changed"]');
    expect(changed).not.toBeNull();
    expect(changed?.textContent ?? '').toContain('20 → 30');
  });

  it('renders an empty state when the node has no rows', () => {
    render(<StateDiffTable snapshots={ARP_SNAPSHOTS} nodeId="r1" stepIndex={0} tableKind="arp" />);
    expect(q('state-diff-empty')).not.toBeNull();
  });
});
