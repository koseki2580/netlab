/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { SwitchForwarder } from '../../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../layers/l3-network/RouterForwarder';
import { RESILIENCE_SCENARIOS } from '../../learning/resilience';
import { layerRegistry } from '../../registry/LayerRegistry';
import { ResilienceLabPanel } from './ResilienceLabPanel';

const canvasState = vi.hoisted(() => ({ edges: [] as { id: string; stroke: string | null }[] }));

vi.mock('../NetlabCanvas', async () => {
  const { useNetlabContext } = await import('../NetlabContext');
  return {
    NetlabCanvas: () => {
      const { topology } = useNetlabContext();
      canvasState.edges = topology.edges.map((edge) => ({
        id: edge.id,
        stroke: (edge.style as { stroke?: string } | undefined)?.stroke ?? null,
      }));
      return <div data-testid="stub-canvas" data-edges={JSON.stringify(canvasState.edges)} />;
    },
  };
});

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

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Flush until the engine outcome resolves and the predict buttons enable. */
async function waitForPredict() {
  for (let i = 0; i < 80; i += 1) {
    const button = testid('resilience-lab-predict-survived') as HTMLButtonElement | null;
    if (button && !button.disabled) return;
    await flush();
  }
}

function edgeStroke(id: string): string | null {
  const edges = JSON.parse(testid('stub-canvas')?.getAttribute('data-edges') ?? '[]') as {
    id: string;
    stroke: string | null;
  }[];
  return edges.find((edge) => edge.id === id)?.stroke ?? null;
}

async function render() {
  act(() => root?.render(<ResilienceLabPanel />));
  await waitForPredict();
}

describe('ResilienceLabPanel', () => {
  it('shows the break and marks the down edge red before any prediction', async () => {
    await render();
    // Scenario 1 fails the R1–R2 link.
    expect(testid('resilience-lab-prompt')?.textContent).toContain('10.2.0.20');
    expect(edgeStroke('e-r1-r2')).toContain('red');
    expect(testid('resilience-lab-predict-survived')).not.toBeNull();
  });

  it('grades a correct "survives" prediction and lights the rerouted path green', async () => {
    await render();
    click('resilience-lab-predict-survived');

    expect(testid('resilience-lab-correct')).not.toBeNull();
    expect(testid('resilience-lab-outcome')?.textContent).toContain('✅');
    // The scenic route through R3 is highlighted green.
    expect(edgeStroke('e-r1-r3')).toContain('green');
    expect(edgeStroke('e-r2-r3')).toContain('green');
  });

  it('marks a wrong prediction and explains why the packet died', async () => {
    await render();
    // Move to scenario 2 (R2 node down → dropped).
    click('resilience-lab-predict-survived');
    click('resilience-lab-next');
    await waitForPredict();

    click('resilience-lab-predict-survived'); // wrong: it actually drops
    expect(testid('resilience-lab-incorrect')).not.toBeNull();
    expect(testid('resilience-lab-outcome')?.textContent).toContain('💀');
    expect(testid('resilience-lab-outcome')?.textContent).toContain('node-down');
  });

  it('walks all scenarios to a scored summary and restarts', async () => {
    await render();
    // Correct predictions: survives, dropped, dropped.
    const expected: ('survived' | 'dropped')[] = ['survived', 'dropped', 'dropped'];
    for (let i = 0; i < RESILIENCE_SCENARIOS.length; i += 1) {
      await waitForPredict();
      click(`resilience-lab-predict-${expected[i]}`);
      click('resilience-lab-next');
    }
    expect(testid('resilience-lab-summary')).not.toBeNull();
    expect(testid('resilience-lab-score')?.textContent).toContain(
      `${RESILIENCE_SCENARIOS.length} / ${RESILIENCE_SCENARIOS.length}`,
    );

    click('resilience-lab-restart');
    await flush();
    expect(testid('resilience-lab-prompt')).not.toBeNull();
  });

  it('renders Japanese inside an I18nProvider with locale ja', async () => {
    act(() =>
      root?.render(
        <I18nProvider locale="ja">
          <ResilienceLabPanel />
        </I18nProvider>,
      ),
    );
    await flush();
    expect(container?.textContent).toContain('レジリエンスラボ');
  });
});
