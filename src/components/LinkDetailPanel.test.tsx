/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimulationContext, type SimulationContextValue } from '../simulation/SimulationContext';
import { SandboxContext, type SandboxContextValue } from '../sandbox/SandboxContext';
import type { LinkQosConfig } from '../types/link';
import type { NetlabEdge } from '../types/topology';
import { LinkDetailPanel } from './LinkDetailPanel';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function edge(link: LinkQosConfig | undefined = undefined): NetlabEdge {
  return {
    id: 'edge-1',
    source: 'a',
    target: 'b',
    data: link === undefined ? {} : { link },
  };
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
}

function simulationValue(): SimulationContextValue {
  return {
    engine: {} as never,
    state: {
      status: 'paused',
      traces: [
        {
          packetId: 'p1',
          srcNodeId: 'a',
          dstNodeId: 'b',
          status: 'delivered',
          hops: [
            {
              step: 0,
              nodeId: 'a',
              nodeLabel: 'A',
              srcIp: '10.0.0.1',
              dstIp: '10.0.0.2',
              ttl: 64,
              protocol: 'TCP',
              event: 'forward',
              action: 'link:enqueued',
              activeEdgeId: 'edge-1',
              linkQos: { edgeId: 'edge-1', segSeq: 1, queueDepth: 1 },
              timestamp: 0,
            },
            {
              step: 1,
              nodeId: 'a',
              nodeLabel: 'A',
              srcIp: '10.0.0.1',
              dstIp: '10.0.0.2',
              ttl: 64,
              protocol: 'TCP',
              event: 'forward',
              action: 'link:dequeued',
              activeEdgeId: 'edge-1',
              linkQos: { edgeId: 'edge-1', segSeq: 1, queueDepth: 0 },
              timestamp: 0,
            },
            {
              step: 2,
              nodeId: 'a',
              nodeLabel: 'A',
              srcIp: '10.0.0.1',
              dstIp: '10.0.0.2',
              ttl: 64,
              protocol: 'TCP',
              event: 'forward',
              action: 'shaper:classified',
              activeEdgeId: 'edge-1',
              shaperTrace: {
                edgeId: 'edge-1',
                classId: 'ef',
                dscp: 46,
                segSeq: 1,
                queueDepth: 1,
              },
              timestamp: 0,
            },
          ],
        },
      ],
      currentTraceId: null,
      currentStep: -1,
      activeEdgeIds: [],
      activePathEdgeIds: [],
      highlightMode: 'path',
      traceColors: {},
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: {},
      natTables: [],
      connTrackTables: [],
    },
    sendPacket: async () => {},
    simulateDhcp: async () => false,
    simulateDns: async () => null,
    getDhcpLeaseState: () => null,
    getDnsCache: () => null,
    exportPcap: () => new Uint8Array(),
    animationSpeed: 500,
    setAnimationSpeed: () => {},
    isRecomputing: false,
  };
}

function renderPanel(
  node: React.ReactNode,
  {
    simulation = simulationValue(),
    sandbox,
  }: { simulation?: SimulationContextValue; sandbox?: SandboxContextValue | null } = {},
) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <SimulationContext.Provider value={simulation}>
        <SandboxContext.Provider value={sandbox ?? null}>{node}</SandboxContext.Provider>
      </SimulationContext.Provider>,
    );
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('LinkDetailPanel', () => {
  it('renders trace-derived queue counters', () => {
    const el = renderPanel(<LinkDetailPanel edge={edge()} />);

    expect(el.textContent).toContain('Currently queued');
    expect(el.textContent).toContain('Total dequeued');
    expect(el.textContent).toContain('1');
  });

  it('blocks apply when loss has no seed', () => {
    const onQosChange = vi.fn();
    const el = renderPanel(
      <LinkDetailPanel edge={edge({ lossPct: 5 })} onQosChange={onQosChange} />,
    );

    expect(el.textContent).toContain('Set a loss seed');
    expect(el.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
    expect(onQosChange).not.toHaveBeenCalled();
  });

  it('emits a link.qos sandbox edit on apply', () => {
    const pushEdit = vi.fn();
    const sandbox = { pushEdit } as unknown as SandboxContextValue;
    const el = renderPanel(<LinkDetailPanel edge={edge()} />, { sandbox });
    const bandwidthInput = el.querySelector<HTMLInputElement>('input[aria-label="Bandwidth bps"]');
    const applyButton = el.querySelector<HTMLButtonElement>('button');
    if (!bandwidthInput || !applyButton) throw new Error('missing controls');

    act(() => {
      setNativeInputValue(bandwidthInput, '1000000');
      bandwidthInput.dispatchEvent(new Event('input', { bubbles: true }));
      applyButton.click();
    });

    expect(pushEdit).toHaveBeenCalledWith({
      kind: 'link.qos',
      target: { kind: 'edge', edgeId: 'edge-1' },
      before: null,
      after: { bandwidthBps: 1_000_000 },
    });
  });

  it('renders traffic shaping counters and emits a link.shaper sandbox edit', () => {
    const pushEdit = vi.fn();
    const sandbox = { pushEdit } as unknown as SandboxContextValue;
    const el = renderPanel(
      <LinkDetailPanel
        edge={edge({
          shaper: {
            classes: [
              { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
              { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
            ],
          },
        })}
      />,
      { sandbox },
    );

    expect(el.textContent).toContain('TRAFFIC SHAPING');
    expect(el.textContent).toContain('ef (DSCP 46)');
    expect(el.textContent).toContain('q 1 / dq 0 / drop 0');

    const applyShaperButton = Array.from(el.querySelectorAll('button')).find(
      (button) => button.textContent === 'Apply shaper',
    );
    if (!applyShaperButton) throw new Error('missing apply shaper button');

    act(() => {
      applyShaperButton.click();
    });

    expect(pushEdit).toHaveBeenCalledWith({
      kind: 'link.shaper',
      target: { kind: 'edge', edgeId: 'edge-1' },
      before: {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
        ],
      },
      after: {
        classes: [
          { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
          { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
        ],
      },
    });
  });
});
