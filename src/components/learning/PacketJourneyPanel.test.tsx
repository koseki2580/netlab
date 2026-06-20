/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { I18nProvider } from '../../i18n';
import { SwitchForwarder } from '../../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../layers/l3-network/RouterForwarder';
import {
  JOURNEY_FLOWS,
  buildJourney,
  buildJourneyTopology,
  journeyProbe,
} from '../../learning/packet-journey';
import type { PacketJourney } from '../../learning/packet-journey';
import { layerRegistry } from '../../registry/LayerRegistry';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { PacketJourneyPanel } from './PacketJourneyPanel';

const canvasState = vi.hoisted(() => ({
  onNodeSelect: null as ((nodeId: string | null) => void) | null,
}));

vi.mock('../NetlabCanvas', async () => {
  const { useNetlabContext } = await import('../NetlabContext');
  return {
    NetlabCanvas: ({ onNodeSelect }: { onNodeSelect?: (nodeId: string | null) => void }) => {
      canvasState.onNodeSelect = onNodeSelect ?? null;
      const { topology } = useNetlabContext();
      const edges = topology.edges.map((edge) => ({
        id: edge.id,
        animated: edge.animated ?? false,
        stroke: (edge.style as { stroke?: string } | undefined)?.stroke ?? null,
      }));
      return <div data-testid="stub-canvas" data-edges={JSON.stringify(edges)} />;
    },
  };
});

// The panel runs the REAL engine; forwarders resolve via the registry (L006).
beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  canvasState.onNodeSelect = null;
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

function testid(id: string) {
  return container?.querySelector(`[data-testid="${id}"]`) ?? null;
}

function click(id: string) {
  const el = testid(id) as HTMLElement;
  act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
}

/** Let the panel's engine precompute resolve. */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The truth, computed the same way the panel computes it. */
async function realJourney(flowIdx: number): Promise<PacketJourney> {
  const topology = buildJourneyTopology();
  const engine = new SimulationEngine(topology, new HookEngine());
  const flow = JOURNEY_FLOWS[flowIdx]!;
  const trace = await engine.precompute(journeyProbe(flow));
  return buildJourney(flow, trace, topology);
}

async function render() {
  act(() => root?.render(<PacketJourneyPanel />));
  await flush();
}

describe('PacketJourneyPanel', () => {
  it('asks for a prediction at the first hop once the engine resolves', async () => {
    await render();
    expect(testid('packet-journey-prompt')?.textContent).toContain('Client');
    expect(testid('packet-journey-answer-r1')).not.toBeNull();
  });

  it('grades a correct prediction, reveals the edge on the canvas, and advances', async () => {
    await render();
    const journey = await realJourney(0);

    click(`packet-journey-answer-${journey.steps[0]!.correctNodeId}`);
    expect(testid('packet-journey-correct')).not.toBeNull();
    const edges = JSON.parse(testid('stub-canvas')?.getAttribute('data-edges') ?? '[]') as {
      id: string;
      animated: boolean;
      stroke: string | null;
    }[];
    expect(edges.find((edge) => edge.id === 'e-c1-r1')?.animated).toBe(true);

    click('packet-journey-advance');
    expect(testid('packet-journey-prompt')?.textContent).toContain('R1');
    // The new hop's prompt is focused so a screen reader announces it on advance.
    expect(document.activeElement).toBe(testid('packet-journey-prompt'));
  });

  it('explains the origin hop instead of showing empty first feedback', async () => {
    await render();
    const journey = await realJourney(0);
    // The first hop is the host's single-link send — no engine routing line.
    click(`packet-journey-answer-${journey.steps[0]!.correctNodeId}`);
    expect(testid('packet-journey-correct')).not.toBeNull();
    const feedback = testid('packet-journey-feedback')?.textContent ?? '';
    expect(feedback).toContain('single link');
    expect(feedback.length).toBeGreaterThan('Correct'.length + 10);
  });

  it('cumulatively reveals every traversed edge as hops are answered (no off-by-one)', async () => {
    await render();
    const topology = buildJourneyTopology();
    const journey = await realJourney(0); // via-lpm: delivers in 3 hops

    const edgeId = (a: string, b: string) =>
      topology.edges.find(
        (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a),
      )?.id;
    const animatedIds = () => {
      const edges = JSON.parse(testid('stub-canvas')?.getAttribute('data-edges') ?? '[]') as {
        id: string;
        animated: boolean;
      }[];
      return new Set(edges.filter((e) => e.animated).map((e) => e.id));
    };

    const expectedSoFar: string[] = [];
    for (const step of journey.steps) {
      click(`packet-journey-answer-${step.correctNodeId}`);
      const id = edgeId(step.nodeId, step.correctNodeId)!;
      expect(id).toBeTruthy();
      expectedSoFar.push(id);
      const animated = animatedIds();
      // Every edge traversed so far is lit — and nothing beyond the current hop.
      for (const want of expectedSoFar) expect(animated.has(want)).toBe(true);
      expect(animated.size).toBe(expectedSoFar.length);
      click('packet-journey-advance');
    }
  });

  it('marks a wrong prediction and names the engine decision in the feedback', async () => {
    await render();
    const journey = await realJourney(0);

    // Step past c1 (single option), then answer R1's branch wrongly.
    click(`packet-journey-answer-${journey.steps[0]!.correctNodeId}`);
    click('packet-journey-advance');
    const r1 = journey.steps[1]!;
    const wrong = r1.options.find((option) => option !== r1.correctNodeId)!;
    click(`packet-journey-answer-${wrong}`);

    expect(testid('packet-journey-incorrect')).not.toBeNull();
    expect(testid('packet-journey-feedback')?.textContent).toContain('10.2.0.0/24');
  });

  it('walks all three journeys to the summary: deliver, deliver, drop', async () => {
    await render();
    for (let flowIdx = 0; flowIdx < JOURNEY_FLOWS.length; flowIdx += 1) {
      const journey = await realJourney(flowIdx);
      for (const step of journey.steps) {
        click(`packet-journey-answer-${step.correctNodeId}`);
        click('packet-journey-advance');
      }
      const outcome = testid('packet-journey-outcome');
      expect(outcome).not.toBeNull();
      expect(outcome?.textContent).toContain(journey.outcome === 'delivered' ? '📬' : '💀');
      click('packet-journey-next');
      await flush();
    }

    expect(testid('packet-journey-summary')).not.toBeNull();
    const totalSteps = 3 + 3 + 2; // via-lpm + via-default + dropped
    expect(testid('packet-journey-score')?.textContent).toContain(`${totalSteps} / ${totalSteps}`);

    click('packet-journey-restart');
    await flush();
    expect(testid('packet-journey-prompt')).not.toBeNull();
  });

  it('renders Japanese inside an I18nProvider with locale ja', async () => {
    act(() =>
      root?.render(
        <I18nProvider locale="ja">
          <PacketJourneyPanel />
        </I18nProvider>,
      ),
    );
    await flush();
    expect(container?.textContent).toContain('パケットジャーニー');
    expect(testid('packet-journey-prompt')?.textContent).toContain('次はどこへ転送される');
  });
});
