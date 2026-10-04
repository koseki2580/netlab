/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext, type SimulationContextValue } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { assertDefined } from '../../utils';
import { NetlabContext } from '../NetlabContext';
import { I18nProvider } from '../../i18n/I18nProvider';
import { PacketTimeline } from './PacketTimeline';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 200, y: 0 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
    },
  ],
  edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
  areas: [],
  routeTables: new Map(),
};

const TRACE: PacketTrace = {
  packetId: 'pkt-1',
  srcNodeId: 'client-1',
  dstNodeId: 'server-1',
  status: 'delivered',
  hops: [
    {
      step: 0,
      nodeId: 'client-1',
      nodeLabel: 'Client',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      ttl: 64,
      protocol: 'TCP',
      event: 'create',
      toNodeId: 'server-1',
      activeEdgeId: 'e1',
      timestamp: 1,
    },
    {
      step: 1,
      nodeId: 'server-1',
      nodeLabel: 'Server',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      ttl: 64,
      protocol: 'TCP',
      event: 'deliver',
      timestamp: 2,
    },
  ],
};

const TRACE_CREATE_HOP = TRACE.hops[0];
const TRACE_DELIVER_HOP = TRACE.hops[1];
assertDefined(TRACE_CREATE_HOP, 'expected trace create hop');
assertDefined(TRACE_DELIVER_HOP, 'expected trace deliver hop');

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    status: 'paused',
    traces: [TRACE],
    currentTraceId: TRACE.packetId,
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
    ...overrides,
  };
}

function makeSimulationContextValue(
  overrides: Partial<SimulationContextValue> = {},
): SimulationContextValue {
  return {
    engine: new SimulationEngine(TOPOLOGY, new HookEngine()),
    state: makeState(),
    sendPacket: async () => {},
    simulateDhcp: async () => false,
    simulateDns: async () => null,
    getDhcpLeaseState: () => null,
    getDnsCache: () => null,
    exportPcap: () => new Uint8Array(),
    animationSpeed: 500,
    setAnimationSpeed: () => {},
    isRecomputing: false,
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let clickedDownloads: { download: string; href: string }[] = [];
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function render(value: SimulationContextValue) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(
      <NetlabContext.Provider
        value={{
          topology: TOPOLOGY,
          routeTable: TOPOLOGY.routeTables,
          areas: TOPOLOGY.areas,
          hookEngine: new HookEngine(),
        }}
      >
        <SimulationContext.Provider value={value}>
          <PacketTimeline />
        </SimulationContext.Provider>
      </NetlabContext.Provider>,
    );
  });
}

function getDownloadButton(): HTMLButtonElement {
  const button = Array.from(container?.querySelectorAll('button') ?? []).find(
    (candidate) => candidate.textContent === 'Download PCAP',
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Download PCAP button was not rendered');
  }

  return button;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  clickedDownloads = [];

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:pcap-export'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clickedDownloads.push({
      download: this.download,
      href: this.href,
    });
  });
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  vi.restoreAllMocks();

  if (typeof originalCreateObjectURL === 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
  } else {
    delete (URL as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
  }

  if (typeof originalRevokeObjectURL === 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
  } else {
    delete (URL as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  }

  if (container) {
    container.remove();
    container = null;
  }
});

describe('PacketTimeline', () => {
  it('disables the Download PCAP button when no current trace is selected', () => {
    render(
      makeSimulationContextValue({
        state: makeState({
          traces: [],
          currentTraceId: null,
        }),
      }),
    );

    expect(getDownloadButton().disabled).toBe(true);
  });

  it('exports the current trace to a browser download when clicked', () => {
    const exportPcap = vi.fn(() => new Uint8Array([0xd4, 0xc3, 0xb2, 0xa1]));
    render(makeSimulationContextValue({ exportPcap }));

    const button = getDownloadButton();
    expect(button.disabled).toBe(false);

    act(() => {
      button.click();
    });

    expect(exportPcap).toHaveBeenCalledWith('pkt-1');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pcap-export');
    expect(clickedDownloads).toEqual([
      {
        download: 'netlab-trace-pkt-1.pcap',
        href: 'blob:pcap-export',
      },
    ]);
  });

  it('renders fragment annotations and next-hop MTU details when present', () => {
    render(
      makeSimulationContextValue({
        state: makeState({
          traces: [
            {
              ...TRACE,
              hops: [
                {
                  ...TRACE_CREATE_HOP,
                  action: 'fragment',
                  fragmentIndex: 0,
                  fragmentCount: 3,
                  nextHopMtu: 600,
                },
              ],
            },
          ],
        }),
      }),
    );

    expect(container?.textContent).toContain('fragment 1/3');
    expect(container?.textContent).toContain('mtu 600');
  });

  it('filters visible hops from the display-filter input without changing engine state', () => {
    vi.useFakeTimers();
    const engine = new SimulationEngine(TOPOLOGY, new HookEngine());
    const before = engine.getState();
    render(
      makeSimulationContextValue({
        engine,
        state: makeState({
          traces: [
            {
              ...TRACE,
              hops: [
                { ...TRACE_CREATE_HOP, protocol: 'TCP', srcPort: 49152, dstPort: 80 },
                { ...TRACE_DELIVER_HOP, protocol: 'UDP', srcPort: 49153, dstPort: 53 },
              ],
            },
          ],
        }),
      }),
    );

    const input = container?.querySelector('[role="searchbox"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('trace filter input was not rendered');
    }

    act(() => {
      setInputValue(input, 'tcp.port == 80');
      vi.advanceTimersByTime(300);
    });

    expect(container?.querySelectorAll('[role="option"]')).toHaveLength(1);
    expect(container?.textContent).toContain('1 of 2 hops shown');
    expect(engine.getState()).toEqual(before);
    vi.useRealTimers();
  });

  it('perf: is wrapped in React.memo', () => {
    expect((PacketTimeline as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
  });
});

// TC-UX-PANEL-07 — the hop codes stay, and each one present is explained.
describe('PacketTimeline code gloss', () => {
  it('explains the codes that appear, next to the list and on each badge', () => {
    render(makeSimulationContextValue());

    const gloss = container?.querySelector('[data-testid="trace-event-gloss"]')?.textContent;
    expect(gloss).toContain('CREATE = the packet is made');
    expect(gloss).toContain('DELIVER = reached its destination');
    expect(gloss).not.toContain('FWD');

    const badge = Array.from(container?.querySelectorAll('span') ?? []).find(
      (span) => span.textContent === 'CREATE',
    );
    expect(badge?.getAttribute('title')).toBe('CREATE = the packet is made');
  });

  it('offers a filter example that is not tied to TCP', () => {
    render(makeSimulationContextValue());
    const input = container?.querySelector<HTMLInputElement>(
      '[data-testid="trace-filter-searchbox"]',
    );
    expect(input?.placeholder).not.toContain('tcp');
    expect(input?.placeholder).toContain('field == value');
  });
});

// TC-231 — a link-time hop says what happened in the reader's language, and
// why the step number jumps: on a shaped link, one step is one millisecond.
describe('PacketTimeline link annotations', () => {
  const LINK_TRACE: PacketTrace = {
    ...TRACE,
    hops: [
      {
        ...TRACE_CREATE_HOP,
        step: 2,
        action: 'link:enqueued',
        linkQos: { edgeId: 'e1', segSeq: 0, queueDepth: 1 },
      },
      {
        ...TRACE_CREATE_HOP,
        step: 3,
        action: 'link:dequeued',
        linkQos: { edgeId: 'e1', segSeq: 0, queueDepth: 0 },
      },
      {
        ...TRACE_CREATE_HOP,
        step: 183,
        action: 'link:arrived',
        linkQos: { edgeId: 'e1', segSeq: 0, queueDepth: 0, totalLatencySteps: 180 },
      },
      { ...TRACE_DELIVER_HOP, step: 184 },
    ],
  };

  function renderIn(locale: 'en' | 'ja') {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <I18nProvider locale={locale}>
          <NetlabContext.Provider
            value={{
              topology: TOPOLOGY,
              routeTable: TOPOLOGY.routeTables,
              areas: TOPOLOGY.areas,
              hookEngine: new HookEngine(),
            }}
          >
            <SimulationContext.Provider
              value={makeSimulationContextValue({ state: makeState({ traces: [LINK_TRACE] }) })}
            >
              <PacketTimeline />
            </SimulationContext.Provider>
          </NetlabContext.Provider>
        </I18nProvider>,
      );
    });
    return container.textContent ?? '';
  }

  it('explains the arrival and the step jump in English', () => {
    const text = renderIn('en');
    expect(text).toContain('queued for the link (1 waiting)');
    expect(text).toContain('sent onto the link (0 waiting)');
    expect(text).toContain('arrived after 180 ms on the link');
    expect(text).toContain('1 step = 1 ms');
    expect(text).not.toContain('arrived 180ms');
  });

  it('explains the arrival and the step jump in Japanese', () => {
    const text = renderIn('ja');
    expect(text).toContain('リンクを 180 ms かけて通過し到着');
    expect(text).toContain('1 ステップ = 1 ms');
    expect(text).toContain('リンクの送信待ちに入った（待ち 1 個）');
    expect(text).not.toContain('arrived');
    expect(text).not.toContain('enqueued');
  });
});

describe('PacketTimeline for a beginner', () => {
  const ARP_TRACE: PacketTrace = {
    ...TRACE,
    hops: [
      { ...TRACE_CREATE_HOP },
      {
        ...TRACE_CREATE_HOP,
        step: 1,
        event: 'arp-request',
        arpFrame: {
          operation: 'request',
          srcMac: '02:00:00:00:00:01',
          srcIp: '10.0.0.10',
          dstMac: 'ff:ff:ff:ff:ff:ff',
          dstIp: '203.0.113.10',
        } as never,
      },
      {
        ...TRACE_DELIVER_HOP,
        step: 2,
        event: 'arp-reply',
        srcIp: '203.0.113.10',
        dstIp: '10.0.0.10',
        arpFrame: {
          operation: 'reply',
          srcMac: '02:e1:2e:d8:d4:08',
          srcIp: '203.0.113.10',
          dstMac: '02:00:00:00:00:01',
          dstIp: '10.0.0.10',
        } as never,
      },
      { ...TRACE_DELIVER_HOP, step: 3 },
    ],
  };
  let host: HTMLDivElement;
  let hostRoot: Root;

  function renderIn(locale: string, trace: PacketTrace | null = ARP_TRACE) {
    host = document.createElement('div');
    document.body.appendChild(host);
    hostRoot = createRoot(host);
    act(() => {
      hostRoot.render(
        <I18nProvider locale={locale}>
          <NetlabContext.Provider
            value={{
              topology: TOPOLOGY,
              routeTable: TOPOLOGY.routeTables,
              areas: TOPOLOGY.areas,
              hookEngine: new HookEngine(),
            }}
          >
            <SimulationContext.Provider
              value={makeSimulationContextValue({
                state: trace
                  ? makeState({ traces: [trace] })
                  : makeState({ traces: [], currentTraceId: null, status: 'idle' }),
              })}
            >
              <PacketTimeline />
            </SimulationContext.Provider>
          </NetlabContext.Provider>
        </I18nProvider>,
      );
    });
  }
  const byId = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`);

  beforeEach(() => {
    window.history.replaceState(null, '', window.location.pathname);
  });

  afterEach(() => {
    act(() => hostRoot.unmount());
    host.remove();
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('TC-346: the filter, its help and the PCAP button wait behind a closed disclosure and stay usable', () => {
    renderIn('ja');
    const toggle = byId('trace-advanced-toggle');
    const section = byId('trace-advanced');
    expect(toggle?.textContent).toContain('くわしい表示（上級者向け）');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(section?.hidden).toBe(true);
    expect(section?.contains(byId('trace-filter-searchbox'))).toBe(true);
    expect(section?.contains(byId('trace-filter-status'))).toBe(true);
    expect(section?.textContent).toContain('PCAP を保存');

    act(() => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(section?.hidden).toBe(false);
  });

  it('TC-346: a filter carried in the address opens the disclosure, so a narrowed list explains itself', () => {
    window.history.replaceState(null, '', '?trace_filter=protocol%20%3D%3D%20tcp');
    renderIn('en');
    expect(byId('trace-advanced-toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect(byId('trace-advanced')?.hidden).toBe(false);
  });

  it('TC-347: ARP rows and event names read in the chosen language, with the codes kept', () => {
    renderIn('ja');
    const rows = Array.from(host.querySelectorAll<HTMLElement>('[data-testid="trace-hop"]'));
    expect(rows.map((row) => row.dataset.event)).toEqual([
      'create',
      'arp-request',
      'arp-reply',
      'deliver',
    ]);
    expect(rows[1]?.textContent).toContain('203.0.113.10 の持ち主は？');
    expect(rows[2]?.textContent).toContain('203.0.113.10 は 02:e1:2e:d8:d4:08 です');
    expect(host.textContent).not.toContain('who has');
    expect(host.textContent).not.toContain('is at');
    expect(rows[0]?.textContent).toContain('CREATE');
    expect(rows[0]?.textContent).toContain('作成');
    expect(rows[1]?.textContent).toContain('ARP 要求');
    expect(rows[3]?.textContent).toContain('到着');
  });

  it('TC-347: the same rows in English keep their wording', () => {
    renderIn('en');
    expect(host.textContent).toContain('who has 203.0.113.10?');
    expect(host.textContent).toContain('203.0.113.10 is at 02:e1:2e:d8:d4:08');
  });

  it('TC-348: an empty timeline says nothing was sent, without naming a button', () => {
    renderIn('ja', null);
    expect(host.textContent).toContain(
      'まだ何も送っていません。送ると、通った道がここに並びます。',
    );
    renderIn('en', null);
    expect(host.textContent).toContain('Nothing sent yet.');
    expect(host.textContent).not.toContain('Send Packet');
  });
});
