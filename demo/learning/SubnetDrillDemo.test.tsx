/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SubnetDrillPanel } from './SubnetDrillDemo';
import {
  DEFAULT_SESSION_LENGTH,
  expectedAnswer,
  generateProblem,
} from '../../src/learning/subnetting';
import {
  createMemoryProgressStorage,
  parseProgressJson,
  ProgressProvider,
  progressStorageKey,
} from '../../src/progress';

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

/** Answer the current question with the given strategy, then advance. */
function answerCurrent(index: number, mode: 'correct' | 'wrong') {
  const value = mode === 'correct' ? expectedAnswer(generateProblem(SEED, index)).expected : 'xx';
  type(value);
  click('subnet-drill-check');
  click('subnet-drill-advance');
}

describe('SubnetDrillPanel session', () => {
  it('shows the first problem and session progress', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    expect(testid('subnet-drill-prompt')?.textContent).toBe(generateProblem(SEED, 0).prompt);
    expect(testid('subnet-drill-progress')?.textContent).toContain(`1 / ${DEFAULT_SESSION_LENGTH}`);
  });

  it('grades a correct answer then advances to the next question', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    type(expectedAnswer(generateProblem(SEED, 0)).expected);
    click('subnet-drill-check');
    expect(testid('subnet-drill-correct')).not.toBeNull();

    click('subnet-drill-advance');
    expect(testid('subnet-drill-prompt')?.textContent).toBe(generateProblem(SEED, 1).prompt);
    expect(testid('subnet-drill-progress')?.textContent).toContain(`2 / ${DEFAULT_SESSION_LENGTH}`);
    expect(testid('subnet-drill-correct')).toBeNull();
  });

  it('reveals the canonical answer for a wrong answer', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    type('definitely-wrong');
    click('subnet-drill-check');
    const feedback = testid('subnet-drill-incorrect');
    expect(feedback?.textContent).toContain(expectedAnswer(generateProblem(SEED, 0)).expected);
  });

  it('ends with a perfect-score summary and restarts on Practice again', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    for (let i = 0; i < DEFAULT_SESSION_LENGTH; i += 1) answerCurrent(i, 'correct');

    expect(testid('subnet-drill-summary')).not.toBeNull();
    expect(testid('subnet-drill-score')?.textContent).toContain(
      `${DEFAULT_SESSION_LENGTH} / ${DEFAULT_SESSION_LENGTH}`,
    );
    expect(testid('subnet-drill-mastered')).not.toBeNull();
    expect(testid('subnet-drill-review')).toBeNull();
    // Focus moves to the results heading rather than being stranded at <body>.
    expect(container?.querySelector('[data-testid="subnet-drill-summary"] h2')).toBe(
      document.activeElement,
    );

    click('subnet-drill-restart');
    expect(testid('subnet-drill-summary')).toBeNull();
    expect(testid('subnet-drill-progress')?.textContent).toContain(`1 / ${DEFAULT_SESSION_LENGTH}`);
  });

  it('shows a concept primer and does not steal focus on initial load', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    expect(testid('subnet-drill-concept')).not.toBeNull();
    expect(document.activeElement).not.toBe(testid('subnet-drill-input'));
  });

  it('moves focus to the input after advancing so keyboard/SR users continue smoothly', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    type(expectedAnswer(generateProblem(SEED, 0)).expected);
    click('subnet-drill-check');
    click('subnet-drill-advance');
    expect(document.activeElement).toBe(testid('subnet-drill-input'));
  });

  it('lists missed skills under review when answers are wrong', () => {
    act(() => root?.render(<SubnetDrillPanel seed={SEED} />));
    for (let i = 0; i < DEFAULT_SESSION_LENGTH; i += 1) answerCurrent(i, 'wrong');

    expect(testid('subnet-drill-score')?.textContent).toContain(`0 / ${DEFAULT_SESSION_LENGTH}`);
    expect(testid('subnet-drill-review')).not.toBeNull();
    expect(testid('subnet-drill-mastered')).toBeNull();
  });

  it('records a drill completion with the score in learner progress', () => {
    const storage = createMemoryProgressStorage();
    act(() =>
      root?.render(
        <ProgressProvider learnerId="learner-1" storage={storage}>
          <SubnetDrillPanel seed={SEED} />
        </ProgressProvider>,
      ),
    );
    for (let i = 0; i < DEFAULT_SESSION_LENGTH; i += 1) answerCurrent(i, 'correct');

    const raw = storage.get(progressStorageKey('learner-1'));
    expect(raw.ok).toBe(true);
    const parsed = parseProgressJson(raw.ok ? (raw.value ?? '') : '');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const completion = parsed.progress.completions.find((entry) => entry.id === 'subnet-drill');
      expect(completion?.kind).toBe('drill');
      expect(completion?.score).toEqual({
        passed: DEFAULT_SESSION_LENGTH,
        total: DEFAULT_SESSION_LENGTH,
      });
    }
  });
});
