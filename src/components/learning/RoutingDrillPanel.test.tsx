/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RoutingDrillPanel } from './RoutingDrillPanel';
import { expectedNextHop, generateRouteProblem } from '../../learning/routing-decision';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

const SEED = 24680;
const LENGTH = 8;

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

function type(value: string) {
  const input = testid('routing-drill-input') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
}

function click(id: string) {
  const el = testid(id) as HTMLElement;
  act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
}

describe('RoutingDrillPanel', () => {
  it('renders the prompt and the routing table', () => {
    act(() => root?.render(<RoutingDrillPanel seed={SEED} />));
    expect(testid('routing-drill-prompt')?.textContent).toBe(generateRouteProblem(SEED, 0).prompt);
    expect(testid('routing-drill-table')?.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(testid('routing-drill-table')?.querySelector('caption')?.textContent).toBe(
      'Routing table',
    );
    expect(testid('routing-drill-table')?.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    expect(testid('routing-drill-progress')?.textContent).toContain(`1 / ${LENGTH}`);
  });

  it('accepts the longest-prefix next-hop and advances', () => {
    act(() => root?.render(<RoutingDrillPanel seed={SEED} />));
    type(expectedNextHop(generateRouteProblem(SEED, 0)));
    click('routing-drill-check');
    expect(testid('routing-drill-correct')).not.toBeNull();

    click('routing-drill-advance');
    expect(testid('routing-drill-progress')?.textContent).toContain(`2 / ${LENGTH}`);
    expect(testid('routing-drill-correct')).toBeNull();
  });

  it('reveals the winning next-hop on a wrong answer', () => {
    act(() => root?.render(<RoutingDrillPanel seed={SEED} />));
    type('192.0.2.99');
    click('routing-drill-check');
    const feedback = testid('routing-drill-incorrect');
    expect(feedback?.textContent).toContain(expectedNextHop(generateRouteProblem(SEED, 0)));
  });

  it('shows a concept primer, keeps load focus, and moves focus on advance', () => {
    act(() => root?.render(<RoutingDrillPanel seed={SEED} />));
    expect(testid('routing-drill-concept')).not.toBeNull();
    expect(document.activeElement).not.toBe(testid('routing-drill-input'));

    type(expectedNextHop(generateRouteProblem(SEED, 0)));
    click('routing-drill-check');
    click('routing-drill-advance');
    expect(document.activeElement).toBe(testid('routing-drill-input'));
  });

  it('reaches a scored summary and restarts', () => {
    act(() => root?.render(<RoutingDrillPanel seed={SEED} />));
    for (let i = 0; i < LENGTH; i += 1) {
      type(expectedNextHop(generateRouteProblem(SEED, i)));
      click('routing-drill-check');
      click('routing-drill-advance');
    }
    expect(testid('routing-drill-summary')).not.toBeNull();
    expect(testid('routing-drill-score')?.textContent).toContain(`${LENGTH} / ${LENGTH}`);
    expect(container?.querySelector('[data-testid="routing-drill-summary"] h2')).toBe(
      document.activeElement,
    );

    click('routing-drill-restart');
    expect(testid('routing-drill-summary')).toBeNull();
    expect(testid('routing-drill-progress')?.textContent).toContain(`1 / ${LENGTH}`);
  });
});
