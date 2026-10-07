/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEV_DESIGN_ID, DEV_TILL_ID } from '../devFixtures';
import type { AttemptStore } from '../store/attemptStore';
import { isSolved } from '../store/estimate';
import { withNodeLabels } from './describe';
import { ExerciseRunner } from './ExerciseRunner';
import { englishProse, fixture, hasJapanese, render, testStore, type Screen } from './testSupport';

// The canvas needs a real layout engine; what it is given is asserted instead.
vi.mock('./ExerciseDiagram', () => ({
  ExerciseDiagram: ({
    topology,
    replay,
  }: {
    topology: { nodes: { id: string; data: { ip?: string } }[] };
    replay: unknown;
  }) => (
    <div
      data-testid="diagram-stub"
      data-till-ip={topology.nodes.find((node) => node.id === 'pc1')?.data.ip ?? ''}
      data-replaying={replay ? 'yes' : 'no'}
    />
  ),
}));

const TILL_INPUT = 'exercise-setting-host-ip-pc1-input';

let screen: Screen | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

function run(
  templateId: string,
  options: { locale?: 'en' | 'ja'; store?: AttemptStore; onNext?: () => void } = {},
) {
  const store = options.store ?? testStore();
  screen = render(
    <ExerciseRunner
      exercise={fixture(templateId)}
      store={store}
      {...(options.onNext ? { onNext: options.onNext } : {})}
    />,
    { locale: options.locale ?? 'ja' },
  );
  const only = () => {
    expect(store.getState().attempts).toHaveLength(1);
    return store.getState().attempts[0]!;
  };
  return { screen, store, only };
}

async function check(target: Screen) {
  await target.click('exercise-check');
  await target.until(
    () =>
      target.find('exercise-check')?.getAttribute('aria-busy') !== 'true' &&
      target.get('exercise-result').hasAttribute('data-passed') &&
      !target.get('exercise-result').hasAttribute('data-stale'),
  );
}

describe('a configure exercise (the till)', () => {
  it('opens one attempt and shows the brief with its goals unmarked', () => {
    const { screen, only } = run(DEV_TILL_ID);
    expect(only()).toMatchObject({
      exerciseId: `${DEV_TILL_ID}~0`,
      outcome: 'abandoned',
      context: 'practice',
      locale: 'ja',
    });
    expect(screen.get('exercise-brief').textContent).toContain('レジから在庫サーバに届きません');
    expect(screen.get('exercise-goal-till').getAttribute('data-mark')).toBe('neutral');
    expect(screen.get('exercise-goal-till').textContent).toContain('レジ から 在庫サーバ に届く');
    expect(screen.find('exercise-next')).toBeNull();
  });

  it('Check at the start names the goal not met, with the reason, and it is not worded as an error', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    await check(screen);
    const result = screen.get('exercise-result');
    expect(result.getAttribute('role')).toBe('status');
    expect(result.getAttribute('data-passed')).toBe('false');
    expect(document.activeElement).toBe(result);
    expect(screen.get('exercise-result-summary').textContent).toContain('もう少しです');
    const till = screen.get('exercise-result-till');
    expect(till.getAttribute('data-passed')).toBe('false');
    expect(till.textContent).toContain('まだ');
    expect(till.textContent).toContain('アドレスの最初の部分');
    expect(screen.get('exercise-result-other-pc').getAttribute('data-passed')).toBe('true');
    // The goal not met is read first.
    expect(result.querySelector('li')?.getAttribute('data-testid')).toBe('exercise-result-till');
    expect(result.textContent).not.toMatch(/エラー|失敗|不正解/);
    expect(only()).toMatchObject({
      outcome: 'abandoned',
      checkPresses: 1,
      failedCheckIds: ['till'],
      changedSettings: 0,
    });
  });

  it('a valid address then Check passes: success, what was done, next; recorded as solved', async () => {
    let went = 0;
    const { screen, only } = run(DEV_TILL_ID, { onNext: () => (went += 1) });
    await check(screen);
    await screen.enter(TILL_INPUT, '192.168.1.50');
    expect(screen.get('diagram-stub').getAttribute('data-till-ip')).toBe('192.168.1.50');
    expect(screen.find('exercise-result-stale')).not.toBeNull();
    await check(screen);
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('true');
    expect(screen.get('exercise-result-summary').textContent).toContain('できました');
    expect(screen.get('exercise-result-done').textContent).toContain('192.168.1.50');
    expect(screen.get('exercise-goal-till').getAttribute('data-mark')).toBe('done');
    expect(screen.find('exercise-check')).toBeNull();
    expect(screen.find('exercise-lessons')).not.toBeNull();
    expect(only()).toMatchObject({
      outcome: 'passed',
      checkPresses: 2,
      firstCheckPassed: false,
      changedSettings: 1,
    });
    expect(isSolved(only())).toBe(true);
    await screen.click('exercise-next');
    expect(went).toBe(1);
  });

  it('reset puts the exercise back to its start', async () => {
    const { screen } = run(DEV_TILL_ID);
    expect(screen.find('exercise-reset')).toBeNull();
    await screen.enter(TILL_INPUT, '192.168.1.50');
    await screen.click('exercise-reset');
    expect(screen.get('diagram-stub').getAttribute('data-till-ip')).toBe('192.168.2.50');
    expect((screen.get(TILL_INPUT) as HTMLInputElement).value).toBe('192.168.2.50');
  });

  it('hints open one at a time, say what they cost first, and a pass after one is "solved with help"', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    expect(screen.get('exercise-hint-cost').textContent).toContain('ヒントを使って解けた');
    expect(screen.find('exercise-hint-1')).toBeNull();
    await screen.click('exercise-hint');
    expect(screen.find('exercise-hint-1')).not.toBeNull();
    expect(screen.find('exercise-hint-2')).toBeNull();
    expect(only().hintsUsed).toBe(1);
    await screen.click('exercise-hint');
    await screen.click('exercise-hint');
    expect(screen.find('exercise-hint-3')).not.toBeNull();
    expect(screen.find('exercise-hint')).toBeNull();
    expect(only().hintsUsed).toBe(3);
    await screen.enter(TILL_INPUT, '192.168.1.50');
    await check(screen);
    expect(screen.get('exercise-result-done').textContent).toContain('ヒントを使って解けた');
    expect(only()).toMatchObject({ outcome: 'passed', hintsUsed: 3 });
    expect(isSolved(only())).toBe(false);
  });

  it('give up asks first, shows the answer as sentences, and a pass after it is not counted', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    await screen.click('exercise-giveup');
    expect(screen.find('exercise-reference')).toBeNull();
    await screen.click('exercise-giveup-no');
    expect(only().revealed).toBe(false);
    await screen.click('exercise-giveup');
    await screen.click('exercise-giveup-yes');
    expect(screen.get('exercise-reference').textContent).toContain(
      'レジ のアドレスを「192.168.1.20」に変える',
    );
    expect(only()).toMatchObject({ revealed: true, outcome: 'gave-up' });
    await screen.click('exercise-reference-apply');
    expect(screen.get('diagram-stub').getAttribute('data-till-ip')).toBe('192.168.1.20');
    await check(screen);
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('true');
    expect(screen.get('exercise-result-done').textContent).toContain('数えません');
    expect(only()).toMatchObject({ revealed: true, outcome: 'gave-up', checkPresses: 0 });
  });

  it('a result with a trace can be watched on the diagram, until a setting changes', async () => {
    const { screen } = run(DEV_TILL_ID);
    await check(screen);
    await screen.click('exercise-replay-till');
    expect(screen.get('diagram-stub').getAttribute('data-replaying')).toBe('yes');
    await screen.enter(TILL_INPUT, '192.168.1.50');
    expect(screen.get('diagram-stub').getAttribute('data-replaying')).toBe('no');
  });

  it('is in one language at a time', async () => {
    const japanese = run(DEV_TILL_ID).screen;
    await check(japanese);
    await japanese.click('exercise-hint');
    for (const block of japanese.container.querySelectorAll(
      'p, li, h2, h3, button, label > span',
    )) {
      expect(englishProse(block.textContent ?? ''), block.textContent ?? '').toEqual([]);
    }
    japanese.unmount();

    const labels = {
      pc1: 'Till',
      pc2: 'Office PC',
      sw1: 'Switch',
      r1: 'Router',
      srv: 'Stock server',
    };
    const till = fixture(DEV_TILL_ID);
    const english = {
      ...till,
      start: withNodeLabels(
        till.start,
        Object.fromEntries(Object.entries(labels).map(([id, en]) => [id, { en, ja: en }])),
        'en',
      ),
    };
    screen = render(<ExerciseRunner exercise={english} store={testStore()} />, { locale: 'en' });
    await check(screen);
    await screen.click('exercise-hint');
    expect(hasJapanese(screen.container.textContent ?? '')).toBe(false);
    expect(screen.get('exercise-check').textContent).toBe('Check');
  });
});

describe('a choose-a-design exercise', () => {
  it('does not run until a design is picked and a prediction made, and says so', async () => {
    const { screen, only } = run(DEV_DESIGN_ID);
    expect(screen.find('exercise-settings')).toBeNull();
    expect(screen.find('exercise-predict')).toBeNull();
    await screen.click('exercise-check');
    expect(screen.get('exercise-design-needed').textContent).toContain('1 つ選び');
    await screen.click('exercise-option-equal');
    expect(screen.find('exercise-predict')).not.toBeNull();
    await screen.click('exercise-check');
    expect(screen.get('exercise-design-needed').textContent).toContain('2 番');
    expect(only()).toMatchObject({ checkPresses: 0 });
    expect(only().prediction).toBeUndefined();
  });

  it('records the prediction against what the design did, then passes on the right design', async () => {
    const { screen, only } = run(DEV_DESIGN_ID);
    await screen.click('exercise-option-equal');
    await screen.click('exercise-predict-reach');
    await check(screen);
    expect(screen.get('exercise-prediction-outcome').getAttribute('data-correct')).toBe('false');
    expect(screen.get('exercise-result-fast').getAttribute('data-passed')).toBe('false');
    expect(only()).toMatchObject({
      outcome: 'abandoned',
      checkPresses: 1,
      prediction: { optionId: 'equal', predicted: 'reach', correct: false },
    });

    await screen.click('exercise-option-slow-high');
    expect(screen.find('exercise-prediction-outcome')).toBeNull();
    await screen.click('exercise-predict-reach');
    await check(screen);
    expect(screen.get('exercise-prediction-outcome').getAttribute('data-correct')).toBe('true');
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('true');
    expect(only()).toMatchObject({
      outcome: 'passed',
      checkPresses: 2,
      changedSettings: 2,
      prediction: { optionId: 'slow-high', predicted: 'reach', correct: true },
    });
  });

  it('a detour is told apart from not arriving', async () => {
    const { screen, only } = run(DEV_DESIGN_ID);
    await screen.click('exercise-option-fast-high');
    await screen.click('exercise-predict-detour');
    await check(screen);
    expect(only().prediction).toEqual({
      optionId: 'fast-high',
      predicted: 'detour',
      correct: true,
    });
  });
});
