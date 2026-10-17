/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEV_DESIGN_ID, DEV_TILL_ID, DEV_VLAN_ID } from '../devFixtures';
import type { AttemptStore } from '../store/attemptStore';
import { isSolved } from '../store/estimate';
import { withNodeLabels } from './describe';
import { ExerciseRunner } from './ExerciseRunner';
import { englishProse, fixture, hasJapanese, render, testStore, type Screen } from './testSupport';

// The canvas needs a real layout engine; what it is given is asserted instead.
vi.mock('./ExerciseDiagram', () => ({
  DiagramLegend: () => null,
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

/** A first Check that misses: an address on a network nobody is on. (A Check with nothing changed is not judged.) */
async function missOnce(target: Screen) {
  await target.enter(TILL_INPUT, '192.168.9.50');
  await check(target);
}

describe('a configure exercise (the till)', () => {
  // TC-479
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

  // TC-663
  it('Check with nothing changed is not judged: it says so, spends no attempt, and offers the hints', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    expect(screen.find('exercise-hint')).toBeNull();
    await screen.click('exercise-check');
    const refused = screen.get('exercise-check-refused');
    expect(refused.getAttribute('data-reason')).toBe('unchanged');
    expect(refused.textContent).toContain('まだ何も変えていません。');
    expect(screen.get('exercise-result').hasAttribute('data-passed')).toBe(false);
    expect(screen.find('exercise-result-summary')).toBeNull();
    expect(only()).toMatchObject({ outcome: 'abandoned', checkPresses: 0 });
    // The count rule still stands, and a learner who is stuck is not left without a hint.
    expect(screen.find('exercise-count-rule')).not.toBeNull();
    expect(screen.find('exercise-hint')).not.toBeNull();
    // Changing something takes the line away, and the next Check is the first.
    await screen.enter(TILL_INPUT, '192.168.1.50');
    expect(screen.find('exercise-check-refused')).toBeNull();
    await check(screen);
    expect(only()).toMatchObject({ outcome: 'passed', checkPresses: 1 });
  });

  // TC-480
  it('a Check that misses names the goal not met, with the reason, and it is not worded as an error', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    await missOnce(screen);
    const result = screen.get('exercise-result');
    expect(result.getAttribute('role')).toBe('status');
    expect(result.getAttribute('data-passed')).toBe('false');
    expect(document.activeElement).toBe(result);
    expect(screen.get('exercise-result-summary').textContent).toContain('もう少しです');
    const till = screen.get('exercise-result-till');
    expect(till.getAttribute('data-passed')).toBe('false');
    expect(till.textContent).toContain('まだ');
    // The grader's reason follows the goal's name.
    expect(till.querySelector('p')?.textContent ?? '').toMatch(/[぀-ヿ一-龯]/);
    // After a miss only the first goal not met is listed; the rest are one press away.
    expect(screen.find('exercise-result-other-pc')).toBeNull();
    await screen.click('exercise-result-more');
    expect(screen.get('exercise-result-other-pc').getAttribute('data-passed')).toBe('true');
    // The goal not met is read first.
    expect(result.querySelector('li')?.getAttribute('data-testid')).toBe('exercise-result-till');
    expect(result.textContent).not.toMatch(/エラー|失敗|不正解/);
    expect(only()).toMatchObject({
      outcome: 'abandoned',
      checkPresses: 1,
      failedCheckIds: ['till'],
      changedSettings: 1,
    });
  });

  // TC-481
  it('a valid address then Check passes: success, what was done, next; recorded as solved', async () => {
    let went = 0;
    const { screen, only } = run(DEV_TILL_ID, { onNext: () => (went += 1) });
    await missOnce(screen);
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
    // TC-587: the till is answered by pressing a chip, so only the first Check counts.
    expect(isSolved(only())).toBe(false);
    await screen.click('exercise-next');
    expect(went).toBe(1);
  });

  // TC-655
  it('Check does not judge while a field holds text that is not a value: it points at the field, and no attempt is used', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    await screen.enter(TILL_INPUT, '192.168.1.300');
    expect(screen.get('diagram-stub').getAttribute('data-till-ip')).toBe('192.168.2.50');
    await screen.click('exercise-check');
    const refused = screen.get('exercise-check-refused');
    expect(refused.getAttribute('data-reason')).toBe('draft');
    expect(refused.getAttribute('role')).toBe('alert');
    expect(refused.textContent).toContain('まだ数えていません');
    expect(document.activeElement).toBe(screen.get(TILL_INPUT));
    expect(screen.get('exercise-result').hasAttribute('data-passed')).toBe(false);
    expect(only()).toMatchObject({ outcome: 'abandoned', checkPresses: 0 });
    // Once the field holds a value, Check judges, and it is the first Check.
    await screen.enter(TILL_INPUT, '192.168.1.50');
    expect(screen.find('exercise-check-refused')).toBeNull();
    await check(screen);
    expect(only()).toMatchObject({ outcome: 'passed', checkPresses: 1, firstCheckPassed: true });
  });

  // TC-482
  it('reset puts the exercise back to its start', async () => {
    const { screen } = run(DEV_TILL_ID);
    expect(screen.find('exercise-reset')).toBeNull();
    await screen.enter(TILL_INPUT, '192.168.1.50');
    await screen.click('exercise-reset');
    expect(screen.get('diagram-stub').getAttribute('data-till-ip')).toBe('192.168.2.50');
    expect((screen.get(TILL_INPUT) as HTMLInputElement).value).toBe('192.168.2.50');
  });

  // TC-618
  it('reset takes the result of the Check before it off the screen', async () => {
    const { screen } = run(DEV_TILL_ID);
    await screen.enter(TILL_INPUT, '192.168.9.50');
    await check(screen);
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('false');
    await screen.click('exercise-reset');
    expect(screen.get('exercise-result').hasAttribute('data-passed')).toBe(false);
    expect(screen.find('exercise-result-stale')).toBeNull();
    expect(screen.find('exercise-result-summary')).toBeNull();
  });

  // TC-483
  it('hints open one at a time, say what they cost first, and a pass after one is "solved with help"', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    // TC-545: no hint is offered before a first try; a Check that misses puts the button beside Check.
    expect(screen.find('exercise-hint')).toBeNull();
    expect(screen.find('exercise-hint-cost')).toBeNull();
    await missOnce(screen);
    expect(screen.get('exercise-actions').contains(screen.get('exercise-hint'))).toBe(true);
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

  // TC-484
  it('give up asks first, shows the answer as sentences, and a pass after it is not counted', async () => {
    const { screen, only } = run(DEV_TILL_ID);
    await screen.click('exercise-giveup');
    expect(screen.find('exercise-reference')).toBeNull();
    await screen.click('exercise-giveup-no');
    expect(only().revealed).toBe(false);
    await screen.click('exercise-giveup');
    await screen.click('exercise-giveup-yes');
    // TC-616: the answer names an address that is among the chips on screen, not another one that would also work.
    const chips = [...screen.container.querySelectorAll('[data-testid^="exercise-chip-"]')].map(
      (chip) => chip.textContent?.trim() ?? '',
    );
    const shown = /レジ のアドレスを「([\d.]+)」に変える/.exec(
      screen.get('exercise-reference').textContent ?? '',
    )?.[1];
    expect(chips).toContain(shown);
    expect(only()).toMatchObject({ revealed: true, outcome: 'gave-up' });
    await screen.click('exercise-reference-apply');
    expect(screen.get('diagram-stub').getAttribute('data-till-ip')).toBe(shown);
    await check(screen);
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('true');
    expect(screen.get('exercise-result-done').textContent).toContain('数えません');
    expect(only()).toMatchObject({ revealed: true, outcome: 'gave-up', checkPresses: 0 });
  });

  // TC-485
  it('a result with a trace can be watched on the diagram, until a setting changes', async () => {
    const { screen } = run(DEV_TILL_ID);
    await missOnce(screen);
    await screen.click('exercise-replay-till');
    expect(screen.get('diagram-stub').getAttribute('data-replaying')).toBe('yes');
    await screen.enter(TILL_INPUT, '192.168.1.50');
    expect(screen.get('diagram-stub').getAttribute('data-replaying')).toBe('no');
  });

  // TC-486
  it('is in one language at a time', async () => {
    const japanese = run(DEV_TILL_ID).screen;
    await missOnce(japanese);
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
    await missOnce(screen);
    await screen.click('exercise-hint');
    expect(hasJapanese(screen.container.textContent ?? '')).toBe(false);
    expect(screen.get('exercise-check').textContent).toBe('Check');
  });
});

describe('a choose-a-design exercise', () => {
  // TC-487
  it('does not run until a design is picked and a prediction made, and says so', async () => {
    const { screen, only } = run(DEV_DESIGN_ID);
    expect(screen.find('exercise-settings')).toBeNull();
    expect(screen.find('exercise-predict')).toBeNull();
    await screen.click('exercise-check');
    expect(screen.get('exercise-design-needed').getAttribute('data-needs')).toBe('choice');
    expect(screen.get('exercise-design-needed').textContent).toContain('1 つ選んで');
    expect(screen.get('exercise-check').textContent).toBe('たしかめる');
    await screen.click('exercise-option-equal');
    expect(screen.find('exercise-predict')).not.toBeNull();
    // TC-617: until a prediction is made the button says what a press will bring.
    expect(screen.get('exercise-check').textContent).toBe('先に予想をえらぶ');
    expect(screen.get('exercise-check').getAttribute('data-waits')).toBe('prediction');
    await screen.click('exercise-check');
    // TC-548: what is missing is said where it is asked, inside the prediction block.
    expect(screen.get('exercise-design-needed').getAttribute('data-needs')).toBe('prediction');
    expect(screen.get('exercise-predict').contains(screen.get('exercise-design-needed'))).toBe(
      true,
    );
    expect(only()).toMatchObject({ checkPresses: 0 });
    expect(only().prediction).toBeUndefined();
    await screen.click('exercise-predict-reach');
    expect(screen.get('exercise-check').textContent).toBe('たしかめる');
    expect(screen.get('exercise-check').hasAttribute('data-waits')).toBe(false);
  });

  // TC-488
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

  // TC-489
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

// TC-538
describe('how a pass is counted by the number of Checks', () => {
  const VLAN_INPUT = (port: string) => `exercise-setting-port-vlan-sw1-${port}-vlan-input`;
  const splitGroups = async (screen: Screen) => {
    await screen.enter(VLAN_INPUT('p3'), '20');
    await screen.enter(VLAN_INPUT('p4'), '20');
  };

  it('where the answer is typed, the second Check still counts; from the third on it is "solved after several tries"', async () => {
    const two = run(DEV_VLAN_ID);
    // Said before the first Check, in one line.
    expect(two.screen.get('exercise-count-rule').textContent).toContain('2 回目まで');
    await two.screen.enter(VLAN_INPUT('p3'), '30');
    await check(two.screen);
    expect(two.screen.find('exercise-count-rule')).toBeNull();
    expect(two.screen.find('exercise-tries-note')).toBeNull();
    await splitGroups(two.screen);
    await check(two.screen);
    expect(two.screen.get('exercise-result-done').getAttribute('data-counted')).toBe('solved');
    expect(two.only().checksToCount).toBeUndefined();
    expect(isSolved(two.only())).toBe(true);
    two.screen.unmount();

    const three = run(DEV_VLAN_ID);
    await three.screen.enter(VLAN_INPUT('p3'), '30');
    await check(three.screen);
    await three.screen.enter(VLAN_INPUT('p3'), '20');
    await check(three.screen);
    // Said before the press that will not count, not after.
    expect(three.screen.get('exercise-tries-note').textContent).toContain('何度かためして解けた');
    await splitGroups(three.screen);
    await check(three.screen);
    const done = three.screen.get('exercise-result-done');
    expect(done.getAttribute('data-counted')).toBe('tries');
    expect(done.textContent).toContain('3 回以上');
    expect(three.only()).toMatchObject({ outcome: 'passed', checkPresses: 3, hintsUsed: 0 });
    expect(isSolved(three.only())).toBe(false);
  });

  // TC-587
  it('where the answer is one of a few things to press, only the first Check counts', async () => {
    const first = run(DEV_TILL_ID);
    // TC-671: beside it, once: what opening the exercise again gives.
    expect(first.screen.get('exercise-count-rule').textContent).toBe(
      '1 回目の「たしかめる」で解けたときだけ数えます。 やり直すと、べつの問題が出ます。',
    );
    await first.screen.enter(TILL_INPUT, '192.168.1.50');
    await check(first.screen);
    expect(first.screen.get('exercise-result-done').getAttribute('data-counted')).toBe('solved');
    expect(first.only()).toMatchObject({ outcome: 'passed', checkPresses: 1, checksToCount: 1 });
    expect(isSolved(first.only())).toBe(true);
    first.screen.unmount();

    const second = run(DEV_TILL_ID);
    await missOnce(second.screen);
    // One miss, and the next pass no longer counts: said now.
    expect(second.screen.get('exercise-tries-note').textContent).toContain('何度かためして解けた');
    await second.screen.enter(TILL_INPUT, '192.168.1.50');
    await check(second.screen);
    const done = second.screen.get('exercise-result-done');
    expect(done.getAttribute('data-counted')).toBe('tries');
    expect(done.textContent).toContain('1 回目の「たしかめる」では解けなかった');
    expect(isSolved(second.only())).toBe(false);
  });

  // TC-597
  it('after a miss the result offers the way to the setting the unmet goal is about, and marks its card', async () => {
    const { screen } = run(DEV_TILL_ID);
    expect(screen.find('exercise-result-setting')).toBeNull();
    await missOnce(screen);
    const card = screen.get('exercise-setting-host-ip-pc1');
    expect(card.hasAttribute('data-pointed')).toBe(false);
    await screen.click('exercise-result-setting');
    expect(card.hasAttribute('data-pointed')).toBe(true);
  });

  // TC-579
  it('the chips stand in a new order in every attempt, and again after "start over"', async () => {
    const chipsOf = (screen: Screen) =>
      [...screen.container.querySelectorAll('[data-testid^="exercise-chip-"]')].map(
        (chip) => chip.textContent ?? '',
      );
    const store = testStore();
    const orders: string[][] = [];
    for (let visit = 0; visit < 6; visit += 1) {
      const { screen } = run(DEV_TILL_ID, { store });
      const chips = chipsOf(screen);
      expect(chips.length).toBeGreaterThanOrEqual(4);
      orders.push(chips);
      if (visit === 5) {
        await screen.click('exercise-chip-0');
        await screen.click('exercise-reset');
        const again = chipsOf(screen);
        expect([...again].sort()).toEqual([...chips].sort());
        expect(again).not.toEqual(chips);
      }
      screen.unmount();
    }
    // The same addresses every time, never in the order of the visit before.
    for (const [index, chips] of orders.entries()) {
      expect([...chips].sort()).toEqual([...(orders[0] ?? [])].sort());
      if (index > 0) expect(chips).not.toEqual(orders[index - 1]);
    }
  });
});

// TC-548
describe('the prediction of a choose-a-design exercise', () => {
  it('is asked directly under the design chosen, and stays when another is chosen', async () => {
    const { screen } = run(DEV_DESIGN_ID);
    await screen.click('exercise-option-equal');
    const chosen = screen.get('exercise-option-equal');
    expect(chosen.nextElementSibling).toBe(screen.get('exercise-predict'));
    await screen.click('exercise-predict-detour');
    const other = [
      ...screen.container.querySelectorAll<HTMLElement>('[data-testid^="exercise-option-"]'),
    ]
      .map((element) => element.getAttribute('data-testid') ?? '')
      .find((id) => id !== 'exercise-option-equal' && id !== 'exercise-option-explain');
    if (!other) throw new Error('the design fixture has one option only');
    await screen.click(other);
    expect(screen.get(other).nextElementSibling).toBe(screen.get('exercise-predict'));
    expect(screen.get('exercise-predict-detour').getAttribute('aria-pressed')).toBe('true');
  });
});

// TC-668
describe('leaving a practice exercise', () => {
  it('before a Check, "skip" says what it costs and records the exercise as skipped', async () => {
    let went = 0;
    const { screen, only } = run(DEV_TILL_ID, { onNext: () => (went += 1) });
    const skip = screen.get('exercise-skip');
    expect(skip.textContent).toBe('とばす（「解けなかった」と数えます）');
    await screen.click('exercise-skip');
    expect(went).toBe(1);
    expect(only()).toMatchObject({ skipped: true, checkPresses: 0 });
  });
});

// TC-672
describe('the rule line of the "/number" exercise', () => {
  it('is the worked rule until one has been solved cleanly, then the bare key', async () => {
    const { exerciseById } = await import('../exerciseSource');
    const prefix = exerciseById('l1-prefix-fit~0', 'ja');
    if (!prefix) throw new Error('no l1-prefix-fit~0');
    const first = render(<ExerciseRunner exercise={prefix} store={testStore()} />, {
      locale: 'ja',
    });
    expect(first.get('exercise-rule').textContent).toMatch(/^ルール：ルータは \/\d+。/);
    first.unmount();

    const store = testStore();
    const id = store.open({ ...prefix, id: 'l1-prefix-fit~1', locale: 'ja' }, 'practice');
    store.recordCheck(id, { passed: true, failedCheckIds: [], changedSettings: 1 });
    screen = render(<ExerciseRunner exercise={prefix} store={store} />, { locale: 'ja' });
    expect(screen.get('exercise-rule').textContent).toBe(
      'ルール：/8 → はじめの 1 つ　/16 → はじめの 2 つ　/24 → はじめの 3 つ',
    );
  });
});
