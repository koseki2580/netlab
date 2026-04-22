/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { basicArp, scenarioRegistry } from '../scenarios';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { SimulationState } from '../types/simulation';
import { TutorialProvider, useTutorialRunner } from './TutorialContext';
import { tutorialRegistry } from './index';
import type { Tutorial } from './types';

function makeTutorial(id = 'arp-basics'): Tutorial {
  return {
    id,
    scenarioId: 'basic-arp',
    title: 'ARP Basics',
    summary: 'summary',
    difficulty: 'intro',
    steps: [
      {
        id: 'step-1',
        title: 'Observe',
        description: 'Observe the trace',
        predicate: ({ state }) => state.traces.length > 0,
      },
    ],
  };
}

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    status: 'idle',
    traces: [],
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
    ...overrides,
  };
}

function makeTraceState(): SimulationState {
  return makeState({
    traces: [
      {
        packetId: 'trace-1',
        srcNodeId: 'client-1',
        dstNodeId: 'server-1',
        hops: [],
        status: 'delivered',
      },
    ],
  });
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latestTutorial: ReturnType<typeof useTutorialRunner> | null = null;
const hookEngine = new HookEngine();
const engine = new SimulationEngine(basicArp.topology, hookEngine);
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function CaptureTutorial() {
  latestTutorial = useTutorialRunner();
  return null;
}

function currentTutorial() {
  if (!latestTutorial) {
    throw new Error('Tutorial context not captured');
  }

  return latestTutorial;
}

function render({
  tutorialId = 'arp-basics',
  simulationState = makeState(),
  child,
}: {
  tutorialId?: string;
  simulationState?: SimulationState;
  child?: React.ReactNode;
} = {}) {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  act(() => {
    root?.render(
      <TutorialProvider
        tutorialId={tutorialId}
        engine={engine}
        simulationState={simulationState}
        routeTable={basicArp.topology.routeTables}
        hookEngine={hookEngine}
      >
        {child ?? <CaptureTutorial />}
      </TutorialProvider>,
    );
  });
}

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  latestTutorial = null;
  tutorialRegistry.clear();
  tutorialRegistry.register(makeTutorial());
  tutorialRegistry.register(makeTutorial('arp-basics-2'));
  if (!scenarioRegistry.get('basic-arp')) {
    scenarioRegistry.register(basicArp);
  }
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });

  root = null;
  latestTutorial = null;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;

  if (container) {
    container.remove();
    container = null;
  }

  tutorialRegistry.clear();
  vi.restoreAllMocks();
});

describe('TutorialProvider', () => {
  it('mounts and exposes pending tutorial state', () => {
    render();

    expect(currentTutorial().state).toEqual({
      status: 'pending',
      tutorialId: 'arp-basics',
      currentStepIndex: 0,
      stepsCompleted: 0,
    });
  });

  it('starts and advances on simulation state changes', () => {
    render();

    act(() => {
      currentTutorial().start();
    });
    render({ simulationState: makeTraceState() });

    expect(currentTutorial().state.status).toBe('passed');
  });

  it('advances on hook events after start', async () => {
    tutorialRegistry.clear();
    tutorialRegistry.register({
      ...makeTutorial(),
      steps: [
        {
          id: 'hook-step',
          title: 'Observe hook',
          description: 'desc',
          predicate: ({ events }) => events.some((event) => event.name === 'packet:forward'),
        },
      ],
    });

    render();

    act(() => {
      currentTutorial().start();
    });

    await act(async () => {
      await hookEngine.emit('packet:forward', {
        packet: {
          id: 'pkt-1',
          srcNodeId: 'client-1',
          dstNodeId: 'server-1',
          currentDeviceId: 'client-1',
          ingressPortId: '',
          path: [],
          timestamp: Date.now(),
          frame: {
            layer: 'L2',
            srcMac: '00:00:00:00:00:01',
            dstMac: '00:00:00:00:00:02',
            etherType: 0x0800,
            payload: {
              layer: 'L3',
              srcIp: '10.0.0.10',
              dstIp: '203.0.113.10',
              ttl: 64,
              protocol: 1,
              payload: {
                layer: 'L4',
                type: 8,
                code: 0,
                checksum: 0,
                identifier: 1,
                sequenceNumber: 1,
                data: 'hello',
              },
            },
          },
        },
        fromNodeId: 'client-1',
        toNodeId: 'router-1',
        decision: {
          action: 'forward',
          nextNodeId: 'router-1',
          edgeId: 'e1',
          egressPort: 'e1',
          packet: {
            id: 'pkt-1',
            srcNodeId: 'client-1',
            dstNodeId: 'server-1',
            currentDeviceId: 'client-1',
            ingressPortId: '',
            path: [],
            timestamp: Date.now(),
            frame: {
              layer: 'L2',
              srcMac: '00:00:00:00:00:01',
              dstMac: '00:00:00:00:00:02',
              etherType: 0x0800,
              payload: {
                layer: 'L3',
                srcIp: '10.0.0.10',
                dstIp: '203.0.113.10',
                ttl: 64,
                protocol: 1,
                payload: {
                  layer: 'L4',
                  type: 8,
                  code: 0,
                  checksum: 0,
                  identifier: 1,
                  sequenceNumber: 1,
                  data: 'hello',
                },
              },
            },
          },
        },
      });
    });

    expect(currentTutorial().state.status).toBe('passed');
  });

  it('supports exit()', () => {
    render();

    act(() => {
      currentTutorial().start();
      currentTutorial().exit();
    });

    expect(currentTutorial().state.status).toBe('exited');
  });

  it('recreates the runner when tutorialId changes', () => {
    render();

    act(() => {
      currentTutorial().start();
    });
    render({ tutorialId: 'arp-basics-2' });

    expect(currentTutorial().state).toEqual({
      status: 'pending',
      tutorialId: 'arp-basics-2',
      currentStepIndex: 0,
      stepsCompleted: 0,
    });
  });

  it('passes children through untouched when tutorialId is absent', () => {
    render({
      child: <div data-testid="passthrough">plain child</div>,
    });

    expect(container?.querySelector('[data-testid="passthrough"]')?.textContent).toBe(
      'plain child',
    );
  });
});
