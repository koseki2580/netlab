/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SubnetDrillPanel } from './SubnetDrillDemo';
import { expectedAnswer, generateProblem } from '../../src/learning/subnetting';

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

const SEED = 12345;

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
  const input = testid('subnet-drill-input') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
}

function click(id: string) {
  const el = testid(id) as HTMLElement;
  act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 })));
}

describe('SubnetDrillPanel', () => {
  it('shows the first generated problem prompt', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    expect(testid('subnet-drill-prompt')?.textContent).toBe(generateProblem(SEED, 0).prompt);
    expect(testid('subnet-drill-score')?.textContent).toContain('0 / 0');
  });

  it('grades a correct answer and updates the score', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    type(expectedAnswer(generateProblem(SEED, 0)).expected);
    click('subnet-drill-check');

    expect(testid('subnet-drill-correct')).not.toBeNull();
    expect(testid('subnet-drill-incorrect')).toBeNull();
    expect(testid('subnet-drill-score')?.textContent).toContain('1 / 1');
  });

  it('reveals the canonical answer and explanation for a wrong answer', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    type('definitely-wrong');
    click('subnet-drill-check');

    const feedback = testid('subnet-drill-incorrect');
    expect(feedback).not.toBeNull();
    expect(feedback?.textContent).toContain(expectedAnswer(generateProblem(SEED, 0)).expected);
    expect(testid('subnet-drill-score')?.textContent).toContain('0 / 1');
  });

  it('advances to a new problem on Next and clears feedback', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    type('whatever');
    click('subnet-drill-check');
    expect(testid('subnet-drill-feedback')?.textContent).not.toBe('');

    click('subnet-drill-next');
    expect(testid('subnet-drill-prompt')?.textContent).toBe(generateProblem(SEED, 1).prompt);
    expect(testid('subnet-drill-correct')).toBeNull();
    expect(testid('subnet-drill-incorrect')).toBeNull();
  });
});
