/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { PacketTrace } from '../../types/simulation';
import { FlowCollectorPanel } from './FlowCollectorPanel';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const traces: PacketTrace[] = [
  {
    packetId: 'p1',
    srcNodeId: 'client',
    dstNodeId: 'server',
    status: 'delivered',
    hops: [
      {
        step: 1,
        nodeId: 'r1',
        nodeLabel: 'R1',
        srcIp: '10.0.0.1',
        dstIp: '10.0.0.2',
        ttl: 63,
        protocol: 'UDP',
        event: 'forward',
        action: 'netflow:flow-update',
        observabilityTrace: {
          kind: 'netflow:flow-update',
          routerId: 'r1',
          flowKey: 'flow-1',
          packets: 1,
          bytes: 120,
        },
        timestamp: 0,
      },
      {
        step: 2,
        nodeId: 'sw1',
        nodeLabel: 'SW1',
        srcIp: '10.0.0.1',
        dstIp: '10.0.0.2',
        ttl: 63,
        protocol: 'UDP',
        event: 'forward',
        action: 'sflow:sampled',
        observabilityTrace: {
          kind: 'sflow:sampled',
          switchId: 'sw1',
          portId: 'p1',
          sequence: 0,
        },
        timestamp: 0,
      },
    ],
  },
];

function render(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(node));
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('FlowCollectorPanel', () => {
  it('renders NetFlow rows by default', () => {
    const el = render(<FlowCollectorPanel traces={traces} />);

    expect(el.textContent).toContain('netflow:flow-update');
    expect(el.textContent).toContain('1 packets / 120 bytes');
  });

  it('switches to sFlow rows', () => {
    const el = render(<FlowCollectorPanel traces={traces} />);
    const sflowButton = Array.from(el.querySelectorAll('button')).find(
      (button) => button.textContent === 'sFlow',
    );
    if (!sflowButton) throw new Error('missing sFlow tab');

    act(() => {
      sflowButton.click();
    });

    expect(el.textContent).toContain('sflow:sampled');
    expect(el.textContent).toContain('seq 0 port p1');
  });
});
