/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacketHop, PacketTrace } from '../../types/simulation';
import { PacketHistoryPanel } from './PacketHistoryPanel';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function hop(step: number, event: PacketHop['event'], over?: string): PacketHop {
  return {
    step,
    nodeId: `n${step}`,
    nodeLabel: `N${step}`,
    srcIp: '10.0.0.1',
    dstIp: '10.0.1.1',
    ttl: 64 - step,
    protocol: 'ICMP',
    event,
    ...(over ? { activeEdgeId: over } : {}),
  } as PacketHop;
}

const TRACES: PacketTrace[] = [
  {
    packetId: 'p1',
    srcNodeId: 'a',
    dstNodeId: 'b',
    status: 'delivered',
    hops: [hop(0, 'create'), hop(1, 'forward', 'e1'), hop(2, 'deliver', 'e2')],
  },
];

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
}

function render(props: Parameters<typeof PacketHistoryPanel>[0]) {
  act(() => root?.render(<PacketHistoryPanel {...props} />));
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
});

describe('PacketHistoryPanel', () => {
  it('says nothing happened yet instead of showing an empty list', () => {
    render({ traces: [] });
    expect(testid('editor-history-empty')).not.toBeNull();
    expect(testid('editor-results-delivered')?.textContent).toBe('0 / 0');
  });

  it('summarises the run', () => {
    render({ traces: TRACES });
    expect(testid('editor-results-delivered')?.textContent).toBe('1 / 1');
    expect(testid('editor-results-dropped')?.textContent).toBe('0');
    expect(testid('editor-results-longest')?.textContent).toBe('3 hops');
  });

  it('lists every hop in order', () => {
    render({ traces: TRACES });
    const steps = [...container!.querySelectorAll('[data-testid^="editor-history-row-"]')].map(
      (el) => el.getAttribute('data-testid'),
    );
    expect(steps).toEqual([
      'editor-history-row-p1-0',
      'editor-history-row-p1-1',
      'editor-history-row-p1-2',
    ]);
  });

  it('hands back the link a hop crossed so the canvas can highlight it', () => {
    const onSelectHop = vi.fn();
    render({ traces: TRACES, onSelectHop });
    act(() =>
      testid('editor-history-row-p1-1')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, button: 0 }),
      ),
    );
    expect(onSelectHop).toHaveBeenCalledTimes(1);
    expect(onSelectHop.mock.calls[0]![1]).toBe('e1');
  });

  it('reports no link for a hop that crossed none', () => {
    const onSelectHop = vi.fn();
    render({ traces: TRACES, onSelectHop });
    // Step 0 is the packet being created at its source.
    act(() =>
      testid('editor-history-row-p1-0')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, button: 0 }),
      ),
    );
    expect(onSelectHop.mock.calls[0]![1]).toBeNull();
  });

  it('marks the selected row for assistive tech, not only with colour', () => {
    render({ traces: TRACES, selectedStep: 1 });
    expect(testid('editor-history-row-p1-1')!.getAttribute('aria-current')).toBe('true');
    expect(testid('editor-history-row-p1-0')!.getAttribute('aria-current')).toBeNull();
  });
});
