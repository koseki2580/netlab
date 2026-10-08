/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExerciseHubBody } from './ExerciseHub';
import { ExercisePageBody } from './ExercisePage';
import {
  exerciseById,
  exercisePool,
  levelTemplates,
  nextExerciseId,
  templateIdOf,
} from './exerciseSource';
import { DEV_VLAN_ID } from './devFixtures';
import { LevelPageBody } from './LevelPage';
import { PlacementPageBody } from './PlacementPage';
import { ReportPageBody } from './ReportPage';
import { EXERCISE_LEVELS, explain, levelSummary } from './store/estimate';
import { postSet } from './store/studyCycle';
import { attempt, failed, solved } from './store/testSupport';
import { englishProse, hasJapanese, render, testStore, type Screen } from './ui/testSupport';

vi.mock('./ui/ExerciseDiagram', () => ({
  ExerciseDiagram: () => <div data-testid="diagram-stub" />,
}));

let screen: Screen | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

/** A store holding these attempts (written through import, as a saved file would be). */
function storeWith(attempts: ReturnType<typeof attempt>[], options: { storage?: boolean } = {}) {
  const store = testStore(options);
  store.importJson(JSON.stringify({ version: 1, attempts, cycles: [] }));
  return store;
}

const level1 = levelTemplates(1).map((template) => template.id);

// TC-501
describe('the exercise source', () => {
  it('finds a level 2 dev fixture by id while the templates have no level 2, for any seed', () => {
    expect(exerciseById(`${DEV_VLAN_ID}~0`, 'ja')?.level).toBe(2);
    expect(exerciseById(`${DEV_VLAN_ID}~1003`, 'ja')?.id).toBe(`${DEV_VLAN_ID}~1003`);
    expect(exerciseById('no-such-template~0', 'ja')).toBeUndefined();
    expect(exerciseById(DEV_VLAN_ID, 'ja')).toBeUndefined();
  });

  it('never gives the template just done twice in a row while another has something unseen', () => {
    const first = nextExerciseId(1, {});
    expect(first).toBeDefined();
    if (level1.length < 2 || !first) return;
    const second = nextExerciseId(1, { avoidTemplateIds: [templateIdOf(first)], seenIds: [first] });
    expect(second).toBeDefined();
    expect(templateIdOf(second ?? first)).not.toBe(templateIdOf(first));
  });
});

describe('the hub', () => {
  // TC-502
  it('shows each level with the store\'s own sentence and a start button; "continue" once begun', () => {
    const attempts = [solved(level1[0] ?? 't', 0, 1), failed(level1[0] ?? 't', 1, 1)];
    screen = render(<ExerciseHubBody store={storeWith(attempts)} />);
    for (const level of EXERCISE_LEVELS) {
      expect(screen.get(`exercises-level-status-${level}`).textContent).toBe(
        explain(levelSummary(attempts, level), 'ja'),
      );
    }
    expect(screen.get('exercises-start-1').textContent).toContain('つづける');
    expect(screen.get('exercises-start-2').textContent).toContain('はじめる');
    expect(screen.get('exercises-start-1').getAttribute('href')).toMatch(/^\/exercises\/do\//);
    expect(screen.get('exercises-placement').getAttribute('href')).toBe('/exercises/placement');
    expect(screen.get('exercises-report').getAttribute('href')).toBe('/exercises/report');
    expect(screen.find('exercises-storage-notice')).toBeNull();
  });

  // TC-536
  it('the level button does not open the kind of task just done while another kind has one left', () => {
    if (level1.length < 2) return;
    // The learner's last exercise was of the kind the pool begins with, but not
    // its first instance: the first unseen one is of that same kind.
    const kind = level1[0] ?? '';
    expect(templateIdOf(nextExerciseId(1, { seenIds: [`${kind}~1`] }) ?? '')).toBe(kind);
    screen = render(<ExerciseHubBody store={storeWith([solved(kind, 1, 1)])} />);
    const href = decodeURIComponent(screen.get('exercises-start-1').getAttribute('href') ?? '');
    expect(templateIdOf(href.replace('/exercises/do/', ''))).not.toBe(kind);
  });

  // TC-503
  it('says so when the record cannot be saved', () => {
    screen = render(<ExerciseHubBody store={testStore({ storage: false })} />);
    expect(screen.get('exercises-storage-notice').textContent).toContain('保存できません');
  });

  // TC-504
  it('is in one language at a time', () => {
    screen = render(<ExerciseHubBody store={testStore()} />);
    for (const block of screen.container.querySelectorAll('p, h2, h3, a, span')) {
      expect(englishProse(block.textContent ?? ''), block.textContent ?? '').toEqual([]);
    }
    screen.unmount();
    screen = render(<ExerciseHubBody store={testStore({ storage: false })} />, { locale: 'en' });
    expect(hasJapanese(screen.container.textContent ?? '')).toBe(false);
    expect(screen.get('exercises-level-status-1').textContent).toBe(
      explain(levelSummary([], 1), 'en'),
    );
  });
});

describe('a level page', () => {
  const open = (store = testStore()) => {
    screen = render(<LevelPageBody store={store} now={() => 5000} />, {
      path: '/exercises/level/1',
      route: '/exercises/level/:level',
    });
    return { screen, store };
  };

  // TC-505
  it('lists the kinds of task with how many of each are solved, and the weakest with its lesson', () => {
    const [first = 't', second = first] = level1;
    const { screen } = open(
      storeWith([solved(first, 0, 1), solved(first, 1, 1), failed(second, 0, 1)]),
    );
    expect(screen.get('exercises-level-status-1').textContent).toContain('レベル 1');
    expect(screen.get(`exercises-kind-${first}`).getAttribute('data-solved')).toBe('2');
    expect(screen.get('exercises-weakest').textContent).toContain(
      levelTemplates(1).find((template) => template.id === second)?.title.ja,
    );
    expect(screen.get('exercises-recent').querySelectorAll('li')).toHaveLength(3);
  });

  // TC-506
  it('"next exercise" is unseen and not from the template done last', () => {
    const [first = 't'] = level1;
    const { screen } = open(storeWith([solved(first, 0, 1)]));
    const next = decodeURIComponent(
      screen.get('exercises-start-1').getAttribute('href') ?? '',
    ).replace('/exercises/do/', '');
    expect(exercisePool(1)).toContain(next);
    expect(next).not.toBe(`${first}~0`);
    if (level1.length > 1) expect(templateIdOf(next)).not.toBe(first);
  });

  // TC-507
  it('"measure before studying" starts a cycle and opens its first "before" exercise', async () => {
    const { screen, store } = open();
    await screen.click('exercises-cycle-start');
    const [cycle] = store.getState().cycles;
    expect(cycle).toMatchObject({ level: 1, id: 'cycle-1-5000' });
    expect(cycle?.preExerciseIds).toHaveLength(4);
    expect(screen.find('elsewhere')).not.toBeNull();
  });

  // TC-508
  it('after the "before" set it lists lessons for what was not solved, then offers to measure again', async () => {
    const store = testStore();
    const { screen } = open(store);
    await screen.click('exercises-cycle-start');
    screen.unmount();
    const cycle = store.getState().cycles[0]!;
    const meta = (id: string) => ({ ...exerciseById(id, 'ja')!, locale: 'ja' as const });
    for (const id of cycle.preExerciseIds) store.open(meta(id), 'pre', cycle.id);
    const again = open(store).screen;
    expect(again.get('exercises-cycle-before').textContent).toContain('4 問中 0 問');
    expect(
      again.get('exercises-cycle').querySelectorAll('[data-testid^="exercise-lesson-"]').length,
    ).toBeGreaterThan(0);
    expect(decodeURIComponent(again.get('exercises-cycle-again').getAttribute('href') ?? '')).toBe(
      `/exercises/do/${postSet(cycle)[0]}?context=post&cycle=${cycle.id}`,
    );
    await again.click(
      again
        .get('exercises-cycle')
        .querySelector('[data-testid^="exercise-lesson-"]')!
        .getAttribute('data-testid')!,
    );
    expect(store.getState().cycles[0]?.lessonsOpened).toHaveLength(1);
  });
});

describe('the exercise page', () => {
  // TC-509
  it('opens the exercise named in the address, in the set the address names', () => {
    const store = testStore();
    store.saveCycle({
      id: 'c1',
      level: 2,
      templateIds: [DEV_VLAN_ID],
      startedAt: 1,
      preExerciseIds: [`${DEV_VLAN_ID}~0`, `${DEV_VLAN_ID}~1`],
      lessonsOpened: [],
    });
    screen = render(<ExercisePageBody store={store} />, {
      path: `/exercises/do/${DEV_VLAN_ID}~0?context=pre&cycle=c1`,
      route: '/exercises/do/:exerciseId',
    });
    expect(screen.get('exercise-brief').textContent).toContain('営業と経理を分ける');
    expect(screen.get('exercise-cycle-progress').textContent).toContain('2 問中 1 問目');
    expect(store.getState().attempts[0]).toMatchObject({ context: 'pre', cycleId: 'c1' });
    expect(screen.find('exercise-skip')).not.toBeNull();
  });

  // TC-510
  it('says so, with a way out, when there is no such exercise', () => {
    screen = render(<ExercisePageBody store={testStore()} />, {
      path: '/exercises/do/nothing~0',
      route: '/exercises/do/:exerciseId',
    });
    expect(screen.get('exercise-missing').querySelector('a')?.getAttribute('href')).toBe(
      '/exercises',
    );
  });
});

// TC-511
describe('placement', () => {
  it('asks one question, runs exercises through the exercise component, and ends with where to start', async () => {
    const store = testStore();
    screen = render(<PlacementPageBody store={store} now={() => 9000} />);
    expect(screen.find('exercise-panel')).toBeNull();
    await screen.click('placement-answer-no');
    const seen: string[] = [];
    for (let turn = 0; turn < 8 && !screen.find('placement-result'); turn += 1) {
      seen.push(screen.get('exercise-panel').getAttribute('data-exercise-id') ?? '');
      await screen.click('exercise-skip');
    }
    // Two unsolved at level 1 and there is nowhere lower to go.
    expect(seen).toHaveLength(2);
    expect(seen.every((id) => exerciseById(id, 'ja')?.level === 1)).toBe(true);
    if (level1.length > 1) expect(templateIdOf(seen[0]!)).not.toBe(templateIdOf(seen[1]!));
    expect(screen.get('placement-result').getAttribute('data-level')).toBe('0');
    expect(screen.get('placement-start').getAttribute('href')).toBe('/exercises/level/1');
    expect(store.getState().placement).toEqual({ level: 0, exercises: 2, completedAt: 9000 });
    expect(store.getState().attempts.map((entry) => entry.context)).toEqual([
      'placement',
      'placement',
    ]);
  });
});

// TC-512
describe('the report', () => {
  it('shows each level, a cycle as before → after per kind of task, and clears only after a yes', async () => {
    const store = testStore();
    const cycle = {
      id: 'c1',
      level: 2 as const,
      templateIds: [DEV_VLAN_ID],
      startedAt: 1,
      preExerciseIds: [`${DEV_VLAN_ID}~0`],
      lessonsOpened: ['/networking/vlan'],
    };
    store.importJson(
      JSON.stringify({
        version: 1,
        cycles: [cycle],
        attempts: [
          attempt(DEV_VLAN_ID, 0, 2, {
            context: 'pre',
            cycleId: 'c1',
            outcome: 'abandoned',
            hintsUsed: 2,
          }),
          ...postSet(cycle).map((id) =>
            attempt(DEV_VLAN_ID, Number(id.split('~')[1]), 2, { context: 'post', cycleId: 'c1' }),
          ),
        ],
      }),
    );
    screen = render(<ReportPageBody store={store} />);
    expect(screen.get('report-level-2').textContent).toContain(
      explain(levelSummary(store.getState().attempts, 2), 'ja'),
    );
    expect(screen.get('report-cycle-total-c1').textContent).toContain(
      '学ぶ前：1 問中 0 問 → 学んだあと：4 問中 4 問',
    );
    expect(screen.get(`report-cycle-row-${DEV_VLAN_ID}`).textContent).toContain(
      '学ぶ前 0/1 → 学んだあと 4/4（開いたヒント：前 2、あと 0）',
    );
    expect(screen.get('report-cycles').textContent).toContain('証明ではなく');

    await screen.click('report-clear');
    expect(store.getState().attempts).toHaveLength(5);
    await screen.click('report-clear-no');
    expect(store.getState().attempts).toHaveLength(5);
    await screen.click('report-clear');
    await screen.click('report-clear-yes');
    expect(store.getState()).toMatchObject({ attempts: [], cycles: [] });
    expect(screen.find('report-cycle-total-c1')).toBeNull();
  });
});
