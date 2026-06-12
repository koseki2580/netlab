/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectedNextHop, generateRouteProblem } from '../../learning/routing-decision';
import { nextHopNodeId } from '../../learning/routing-decision/topology';
import { VisualRoutingDrillPanel } from './VisualRoutingDrillPanel';

/**
 * NetlabCanvas is replaced with a stub that captures `onNodeSelect`, so the
 * test can simulate the learner clicking a node. The real canvas's
 * `onNodeSelect` contract (click → id, pane click → null, deduped) is
 * behavior-tested in NetlabCanvas.test.tsx; this test covers the panel's side
 * of that contract.
 */
const canvasState = vi.hoisted(() => ({
  onNodeSelect: null as ((nodeId: string | null) => void) | null,
}));

vi.mock('../NetlabCanvas', async () => {
  const { useNetlabContext } = await import('../NetlabContext');
  return {
    NetlabCanvas: ({ onNodeSelect }: { onNodeSelect?: (nodeId: string | null) => void }) => {
      canvasState.onNodeSelect = onNodeSelect ?? null;
      // Surface the live context edges so tests can assert canvas feedback.
      const { topology } = useNetlabContext();
      const edges = topology.edges.map((edge) => ({
        target: edge.target,
        animated: edge.animated ?? false,
        stroke: (edge.style as { stroke?: string } | undefined)?.stroke ?? null,
      }));
      return <div data-testid="stub-canvas" data-edges={JSON.stringify(edges)} />;
    },
  };
});

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

const SEED = 13579;
const LENGTH = 8;

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

function clickNode(nodeId: string) {
  act(() => canvasState.onNodeSelect?.(nodeId));
}

describe('VisualRoutingDrillPanel', () => {
  it('renders the prompt, table, canvas, and one answer button per next-hop', () => {
    act(() => root?.render(<VisualRoutingDrillPanel seed={SEED} />));
    const problem = generateRouteProblem(SEED, 0);
    expect(testid('visual-routing-drill-prompt')?.textContent).toBe(problem.prompt);
    expect(testid('visual-routing-drill-table')?.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(testid('stub-canvas')).not.toBeNull();
    for (const route of problem.routes) {
      expect(testid(`visual-routing-drill-answer-${route.nextHop}`)).not.toBeNull();
    }
  });

  it('grades a canvas node click as the answer', () => {
    act(() => root?.render(<VisualRoutingDrillPanel seed={SEED} />));
    clickNode(nextHopNodeId(expectedNextHop(generateRouteProblem(SEED, 0))));
    expect(testid('visual-routing-drill-correct')).not.toBeNull();
  });

  it('ignores clicks on the deciding router and locks in one answer per question', () => {
    act(() => root?.render(<VisualRoutingDrillPanel seed={SEED} />));
    clickNode('r-deciding');
    expect(testid('visual-routing-drill-correct')).toBeNull();
    expect(testid('visual-routing-drill-incorrect')).toBeNull();

    const expected = expectedNextHop(generateRouteProblem(SEED, 0));
    const wrong = generateRouteProblem(SEED, 0).routes.find(
      (route) => route.nextHop !== expected,
    )?.nextHop;
    clickNode(nextHopNodeId(wrong ?? ''));
    expect(testid('visual-routing-drill-incorrect')).not.toBeNull();

    // A second click cannot overwrite the locked-in answer.
    clickNode(nextHopNodeId(expected));
    expect(testid('visual-routing-drill-incorrect')).not.toBeNull();
    expect(testid('visual-routing-drill-correct')).toBeNull();
  });

  it('answers via the keyboard-accessible buttons and advances', () => {
    act(() => root?.render(<VisualRoutingDrillPanel seed={SEED} />));
    click(`visual-routing-drill-answer-${expectedNextHop(generateRouteProblem(SEED, 0))}`);
    expect(testid('visual-routing-drill-correct')).not.toBeNull();

    click('visual-routing-drill-advance');
    expect(testid('visual-routing-drill-prompt')?.textContent).toBe(
      generateRouteProblem(SEED, 1).prompt,
    );
    expect(testid('visual-routing-drill-progress')?.textContent).toContain(`2 / ${LENGTH}`);
  });

  it('marks the LPM winner and a wrongly chosen hop on the answer buttons', () => {
    act(() => root?.render(<VisualRoutingDrillPanel seed={SEED} />));
    const problem = generateRouteProblem(SEED, 0);
    const expected = expectedNextHop(problem);
    const wrong = problem.routes.find((route) => route.nextHop !== expected)?.nextHop ?? '';

    click(`visual-routing-drill-answer-${wrong}`);

    const winner = testid(`visual-routing-drill-answer-${expected}`);
    const chosen = testid(`visual-routing-drill-answer-${wrong}`);
    expect(winner?.getAttribute('data-answer-state')).toBe('winner');
    expect(winner?.textContent).toContain('✓');
    expect(chosen?.getAttribute('data-answer-state')).toBe('wrong-choice');
    expect(chosen?.textContent).toContain('✗');
  });

  it('highlights the winning edge (and a wrong pick) on the canvas after grading', () => {
    act(() => root?.render(<VisualRoutingDrillPanel seed={SEED} />));
    const problem = generateRouteProblem(SEED, 0);
    const expected = expectedNextHop(problem);
    const wrong = problem.routes.find((route) => route.nextHop !== expected)?.nextHop ?? '';

    const readEdges = () =>
      JSON.parse(testid('stub-canvas')?.getAttribute('data-edges') ?? '[]') as {
        target: string;
        animated: boolean;
        stroke: string | null;
      }[];

    // Before answering: no edge is styled.
    expect(readEdges().every((edge) => !edge.animated && edge.stroke === null)).toBe(true);

    click(`visual-routing-drill-answer-${wrong}`);

    const edges = readEdges();
    const winnerEdge = edges.find((edge) => edge.target === nextHopNodeId(expected));
    const wrongEdge = edges.find((edge) => edge.target === nextHopNodeId(wrong));
    expect(winnerEdge?.animated).toBe(true);
    expect(winnerEdge?.stroke).toContain('green');
    expect(wrongEdge?.stroke).toContain('red');
  });

  it('completes a session with a focused summary and restarts', () => {
    act(() => root?.render(<VisualRoutingDrillPanel seed={SEED} />));
    for (let i = 0; i < LENGTH; i += 1) {
      click(`visual-routing-drill-answer-${expectedNextHop(generateRouteProblem(SEED, i))}`);
      click('visual-routing-drill-advance');
    }
    expect(testid('visual-routing-drill-summary')).not.toBeNull();
    expect(testid('visual-routing-drill-score')?.textContent).toContain(`${LENGTH} / ${LENGTH}`);
    expect(container?.querySelector('[data-testid="visual-routing-drill-summary"] h2')).toBe(
      document.activeElement,
    );

    click('visual-routing-drill-restart');
    expect(testid('visual-routing-drill-summary')).toBeNull();
    expect(testid('visual-routing-drill-progress')?.textContent).toContain(`1 / ${LENGTH}`);
  });
});
