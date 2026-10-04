/* @vitest-environment jsdom */

import type React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PacketHop, RoutingDecision, SimulationState } from '../../types/simulation';
import { I18nProvider } from '../../i18n/I18nProvider';
import { StepControls } from './StepControls';

const simulationMock = vi.hoisted(() => ({
  engine: {
    step: vi.fn(),
    reset: vi.fn(),
    selectTrace: vi.fn(),
  },
  state: null as SimulationState | null,
}));

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => ({
    engine: simulationMock.engine,
    state: simulationMock.state,
  }),
}));

vi.mock('./TraceSelector', async () => {
  const React = await import('react');

  return {
    TraceSelector: () => React.createElement('div', null, 'TRACE SELECTOR'),
  };
});

function makeDecision(): RoutingDecision {
  return {
    dstIp: '203.0.113.10',
    winner: {
      destination: '203.0.113.0/24',
      nextHop: 'direct',
      metric: 0,
      protocol: 'static',
      adminDistance: 1,
      matched: true,
      selectedByLpm: true,
    },
    candidates: [
      {
        destination: '203.0.113.0/24',
        nextHop: 'direct',
        metric: 0,
        protocol: 'static',
        adminDistance: 1,
        matched: true,
        selectedByLpm: true,
      },
      {
        destination: '0.0.0.0/0',
        nextHop: '10.0.0.1',
        metric: 10,
        protocol: 'rip',
        adminDistance: 120,
        matched: true,
        selectedByLpm: false,
      },
    ],
    explanation: 'Matched 203.0.113.0/24 via direct (static, AD=1)',
  };
}

function makeHop(overrides: Partial<PacketHop>): PacketHop {
  return {
    step: 0,
    nodeId: 'client-1',
    nodeLabel: 'Client',
    srcIp: '10.0.0.10',
    dstIp: '203.0.113.10',
    ttl: 64,
    protocol: 'TCP',
    event: 'create',
    timestamp: 1,
    ...overrides,
  };
}

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  const hops = [
    makeHop({ step: 0, nodeId: 'client-1', nodeLabel: 'Client', event: 'create' }),
    makeHop({
      step: 1,
      nodeId: 'router-1',
      nodeLabel: 'Router',
      event: 'forward',
      routingDecision: makeDecision(),
    }),
    makeHop({
      step: 2,
      nodeId: 'server-1',
      nodeLabel: 'Server',
      event: 'deliver',
    }),
  ];

  return {
    status: 'paused',
    traces: [
      {
        packetId: 'trace-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        hops,
        status: 'delivered',
      },
    ],
    currentTraceId: 'trace-1',
    currentStep: 1,
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

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function render(ui: React.ReactElement = <StepControls />) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(ui);
  });
}

function findButton(text: string) {
  return Array.from(container?.querySelectorAll('button') ?? []).find((button) =>
    button.textContent?.includes(text),
  );
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  simulationMock.engine.step.mockReset();
  simulationMock.engine.reset.mockReset();
  simulationMock.engine.selectTrace.mockReset();
  simulationMock.state = makeState();
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  vi.restoreAllMocks();
});

describe('StepControls', () => {
  describe('initial state', () => {
    it('renders message when no trace loaded', () => {
      simulationMock.state = makeState({
        status: 'idle',
        traces: [],
        currentTraceId: null,
        currentStep: -1,
      });
      render();

      expect(container?.textContent).toContain('Nothing sent yet.');
    });

    it('renders Next Step and Reset buttons', () => {
      render();

      expect(findButton('Next Step')).toBeDefined();
      expect(findButton('Reset')).toBeDefined();
    });
  });

  describe('hop display', () => {
    it('shows hops up to currentStep', () => {
      simulationMock.state = makeState({ currentStep: 1 });
      render();

      expect(container?.textContent).toContain('Client');
      expect(container?.textContent).toContain('Router');
      expect(container?.textContent).not.toContain('Server');
    });

    it('highlights current hop', () => {
      simulationMock.state = makeState({ currentStep: 1 });
      render();

      // The accent token rather than its dark-theme value: the same component
      // is drawn in a light theme too, and the contract is "the current hop
      // wears the accent colour", not "the current hop is #7dd3fc".
      expect(container?.innerHTML).toContain(
        'background: var(--netlab-accent-cyan); border: 2px solid var(--netlab-accent-cyan);',
      );
    });

    it('shows routing decision when present', () => {
      render();

      expect(container?.textContent).toContain('LPM ROUTING TABLE');
      expect(container?.textContent).toContain('Matched 203.0.113.0/24 via direct');
    });

    it('shows drop reason for dropped hops', () => {
      simulationMock.state = makeState({
        currentStep: 1,
        traces: [
          {
            packetId: 'trace-1',
            srcNodeId: 'client-1',
            dstNodeId: 'server-1',
            status: 'dropped',
            hops: [
              makeHop({ step: 0, nodeLabel: 'Client' }),
              makeHop({
                step: 1,
                nodeId: 'router-1',
                nodeLabel: 'Router',
                event: 'drop',
                reason: 'no-route',
              }),
            ],
          },
        ],
      });
      render();

      expect(container?.textContent).toContain('Drop reason: no-route');
    });
  });

  describe('button states', () => {
    it('Next Step disabled when status is idle', () => {
      simulationMock.state = makeState({ status: 'idle' });
      render();

      expect(findButton('Next Step')?.disabled).toBe(true);
    });

    it('Next Step disabled when status is done', () => {
      simulationMock.state = makeState({ status: 'done' });
      render();

      expect(findButton('Next Step')?.disabled).toBe(true);
    });

    it('Reset disabled when status is idle', () => {
      simulationMock.state = makeState({ status: 'idle' });
      render();

      expect(findButton('Reset')?.disabled).toBe(true);
    });

    it('Next Step enabled when status is paused', () => {
      simulationMock.state = makeState({ status: 'paused' });
      render();

      expect(findButton('Next Step')?.disabled).toBe(false);
    });
  });

  describe('RoutingTable', () => {
    it('renders column headers', () => {
      render();

      expect(container?.textContent).toContain('DESTINATION');
      expect(container?.textContent).toContain('NEXT HOP');
      expect(container?.textContent).toContain('PROTOCOL');
      expect(container?.textContent).toContain('AD');
      expect(container?.textContent).toContain('METRIC');
    });

    it('renders candidate routes with protocol and metrics', () => {
      render();

      expect(container?.textContent).toContain('203.0.113.0/24');
      expect(container?.textContent).toContain('static');
      expect(container?.textContent).toContain('rip');
      expect(container?.textContent).toContain('120');
    });

    it('highlights selected route', () => {
      render();

      expect(container?.textContent).toContain('MATCH ✓');
    });

    it('renders explanation text', () => {
      render();

      expect(container?.textContent).toContain('Matched 203.0.113.0/24 via direct (static, AD=1)');
    });
  });
});

// TC-UX-PANEL-06 — the route candidates read as separate columns, AD is
// explained, and the verdict is in the reader's language.
describe('StepControls routing table for a learner', () => {
  it('keeps the destination and next hop apart and glosses AD', () => {
    render();
    const header = container?.querySelector('[data-testid="step-route-ad-header"]');
    expect(header?.textContent).toBe('AD');
    expect(header?.getAttribute('title')).toContain('administrative distance');
    expect(container?.querySelector('[data-testid="step-route-ad-caption"]')?.textContent).toBe(
      'AD = administrative distance, lower wins',
    );
    const row = container?.querySelector('[data-testid="step-route-destination"]')
      ?.parentElement as HTMLElement | null;
    expect(row?.style.columnGap).toBe('8px');
  });

  it('gives the verdict in Japanese', () => {
    render(
      <I18nProvider locale="ja">
        <StepControls />
      </I18nProvider>,
    );
    const verdict = container?.querySelector('[data-testid="step-route-verdict"]')?.textContent;
    expect(verdict).toContain('203.0.113.0/24 に一致したので');
    expect(verdict).not.toContain('Matched');
  });
});

describe('StepControls across the traces of one exchange', () => {
  // A fake engine that behaves like the real one for these two calls, so the
  // test asserts what the learner sees after pressing the button.
  function wireEngine() {
    simulationMock.engine.selectTrace.mockImplementation((packetId: string) => {
      simulationMock.state = {
        ...simulationMock.state!,
        currentTraceId: packetId,
        currentStep: -1,
        status: 'paused',
      };
    });
    simulationMock.engine.step.mockImplementation(() => {
      const state = simulationMock.state!;
      const trace = state.traces.find((t) => t.packetId === state.currentTraceId)!;
      const next = state.currentStep + 1;
      simulationMock.state = {
        ...state,
        currentStep: next,
        selectedHop: trace.hops[next] ?? null,
        status: next === trace.hops.length - 1 ? 'done' : 'paused',
      };
    });
  }

  function twoMessageExchange(): SimulationState {
    const hops = (from: string, to: string) => [
      makeHop({ step: 0, nodeId: from, nodeLabel: from, event: 'create' }),
      makeHop({ step: 1, nodeId: to, nodeLabel: to, event: 'deliver' }),
    ];
    return makeState({
      traces: [
        {
          packetId: 'discover',
          label: 'DHCP DISCOVER',
          srcNodeId: 'client',
          dstNodeId: 'server',
          hops: hops('client', 'server'),
          status: 'delivered',
        },
        {
          packetId: 'offer',
          label: 'DHCP OFFER',
          srcNodeId: 'server',
          dstNodeId: 'client',
          hops: hops('server', 'client'),
          status: 'delivered',
        },
      ],
      currentTraceId: 'discover',
      currentStep: -1,
      status: 'paused',
    });
  }

  function pressNext() {
    act(() => {
      findButton('Next Step')?.click();
    });
    render(<StepControls continueAcrossTraces />);
  }

  it('TC-LESSON-DHCP-STEP: next step carries on from the last hop of one message into the next', () => {
    wireEngine();
    simulationMock.state = twoMessageExchange();
    render(<StepControls continueAcrossTraces />);
    expect(container?.querySelector('[data-testid="step-exchange-position"]')?.textContent).toBe(
      'Message 1 of 2: DHCP DISCOVER',
    );

    pressNext();
    pressNext();
    expect(container?.textContent).toContain('Next step goes on to DHCP OFFER');
    expect(findButton('Next Step')?.disabled).toBe(false);

    pressNext();
    expect(container?.querySelector('[data-testid="step-exchange-position"]')?.textContent).toBe(
      'Message 2 of 2: DHCP OFFER',
    );
    pressNext();
    // The last hop of the last message: the whole exchange has been walked.
    expect(findButton('Next Step')?.disabled).toBe(true);
    expect(container?.textContent).toContain('Reached the end');
  });

  it('stops at the end of one trace when the lesson does not ask to carry on', () => {
    wireEngine();
    simulationMock.state = { ...twoMessageExchange(), currentStep: 1, status: 'done' };
    render(<StepControls />);
    expect(findButton('Next Step')?.disabled).toBe(true);
    expect(container?.querySelector('[data-testid="step-exchange-position"]')).toBeNull();
  });
});

describe('StepControls for a beginner', () => {
  const ja = (ui: React.ReactElement) => <I18nProvider locale="ja">{ui}</I18nProvider>;
  const byId = (id: string) => container?.querySelector(`[data-testid="${id}"]`) ?? null;

  it('TC-341: the step button and the readout come before the history, so history grows below them', () => {
    simulationMock.state = makeState({ currentStep: 1 });
    render();

    const button = byId('demo-primary-action');
    const readout = byId('step-readout');
    const history = byId('step-history');
    expect(button && readout && history).toBeTruthy();
    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
    expect((button as Element).compareDocumentPosition(history as Element) & FOLLOWING).toBe(
      FOLLOWING,
    );
    expect((readout as Element).compareDocumentPosition(history as Element) & FOLLOWING).toBe(
      FOLLOWING,
    );
    expect(history?.textContent).toContain('Router');
  });

  it('TC-342: the readout says where the packet is, and the hint what a press does and how many there are', () => {
    simulationMock.state = makeState({ currentStep: 1 });
    render();
    expect(byId('step-readout')?.textContent).toBe('Step 2 of 3: Router (forwarded)');
    expect(byId('step-hint')?.textContent).toContain('3 presses in all');

    render(ja(<StepControls />));
    expect(byId('step-readout')?.textContent).toBe('3 個のうち 2 番目：Router（転送）');
    expect(byId('step-hint')?.textContent).toBe(
      '押すたびに、パケットが次の機器へ 1 回受け渡されます（＝1 ホップ）。全部で 3 回。',
    );
  });

  it('TC-343: with nothing sent, the hint names no button that is not there and the step button stands back', () => {
    simulationMock.state = makeState({
      status: 'idle',
      traces: [],
      currentTraceId: null,
      currentStep: -1,
    });
    render(ja(<StepControls />));

    expect(byId('step-idle-hint')?.textContent).toBe(
      'まだ何も送っていません。この画面のボタンで通信を始めると、ここから 1 つずつ進められます。',
    );
    expect(container?.textContent).not.toContain('パケットを送ると始まります');
    const button = byId('demo-primary-action') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.style.background).toBe('transparent');
    expect(byId('step-readout')).toBeNull();
  });

  it('TC-344: once a trace exists, the readout says how it ended before any step is taken', () => {
    simulationMock.state = makeState({ currentStep: -1 });
    render();
    expect(byId('step-readout')?.textContent).toBe('Delivered: it ended at Server.');

    const state = makeState({ currentStep: -1 });
    const hops = [
      makeHop({ step: 0 }),
      makeHop({ step: 1, nodeLabel: 'Router', event: 'drop', reason: 'no-route' }),
    ];
    simulationMock.state = {
      ...state,
      traces: [{ ...state.traces[0]!, hops, status: 'dropped' }],
    };
    render(ja(<StepControls />));
    expect(byId('step-readout')?.textContent).toBe('Router で破棄されました（no-route）。');
  });
});
