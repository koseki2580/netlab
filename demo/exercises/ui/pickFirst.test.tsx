/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exerciseById } from '../exerciseSource';
import { isSolved, isSolvedAfterTries } from '../store/estimate';
import { ExerciseRunner } from './ExerciseRunner';
import { render, testStore, type Screen } from './testSupport';

// The canvas needs a real layout engine; the form is what is tested here.
vi.mock('./ExerciseDiagram', () => ({
  ExerciseDiagram: ({ onPick }: { onPick?: (pick: { kind: 'node'; id: string }) => void }) => (
    <div data-testid="diagram-stub">
      {['pc1', 'pc2', 'pc3'].map((id) => (
        <button
          key={id}
          data-testid={`stub-node-${id}`}
          onClick={() => onPick?.({ kind: 'node', id })}
        >
          {id}
        </button>
      ))}
    </div>
  ),
}));

let screen: Screen | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

const exercise = exerciseById('l1-which-pc~0', 'ja');
if (!exercise?.pickFirst) throw new Error('l1-which-pc~0 has no pickFirst');
const [faulty] = exercise.pickFirst.faulty;
const healthy = ['pc1', 'pc2', 'pc3'].filter((id) => !exercise.pickFirst?.faulty.includes(id));
const card = (id: string) => `exercise-setting-host-ip-${id}`;

function open() {
  const store = testStore();
  screen = render(<ExerciseRunner exercise={exercise!} store={store} />, { locale: 'ja' });
  return { screen, only: () => store.getState().attempts[0]! };
}

async function check(target: Screen) {
  await target.click('exercise-check');
  await target.until(() => target.get('exercise-result').hasAttribute('data-passed'));
}

/** Press the chip that fits: the one address on the neighbours' network that nobody uses. */
async function pressUsableChip(target: Screen) {
  const used = exercise!.start.nodes.flatMap((node) => [
    ...(node.data.ip ? [node.data.ip] : []),
    ...(node.data.interfaces ?? []).map((side) => side.ipAddress),
  ]);
  const network = exercise!.start.nodes
    .find((node) => node.id === healthy[0])
    ?.data.ip?.split('.')
    .slice(0, 3)
    .join('.');
  const chips = [
    ...target.get(card(faulty ?? '')).querySelectorAll('[data-testid^="exercise-chip-"]'),
  ];
  const usable = chips.find(
    (chip) =>
      (chip.textContent ?? '').startsWith(`${network}.`) && !used.includes(chip.textContent ?? ''),
  );
  if (!usable) throw new Error('no usable chip');
  await target.click(usable.getAttribute('data-testid') ?? '');
}

// TC-589, TC-604
describe('find the device with the wrong address: point at it first', () => {
  it('no device can be changed before one is pointed at; each card shows its address to compare', () => {
    const { screen } = open();
    expect(screen.get('exercise-suspect-step').textContent).toContain('1 台えらんでください');
    for (const id of ['pc1', 'pc2', 'pc3']) {
      expect(screen.get(`${card(id)}-current`).textContent).toMatch(/\d+\.\d+\.\d+\.\d+/);
      expect(screen.find(`exercise-suspect-${id}`)).not.toBeNull();
      expect(screen.find(`${card(id)}-input`)).toBeNull();
    }
    expect(screen.find('exercise-chip-0')).toBeNull();
    expect(screen.get('exercise-count-rule').textContent).toContain(
      'えらぶのも「たしかめる」も 1 回目だけ数えます。',
    );
  });

  it('Check before a device is pointed at checks nothing, costs nothing, and says what is missing', async () => {
    const { screen, only } = open();
    await screen.click('exercise-check');
    expect(screen.get('exercise-suspect-step').hasAttribute('data-needed')).toBe(true);
    expect(screen.get('exercise-suspect-step').getAttribute('role')).toBe('alert');
    expect(screen.get('exercise-result').hasAttribute('data-passed')).toBe(false);
    // No goal is marked, so nothing says which device cannot reach the server.
    expect(screen.container.querySelector('[data-mark="not-yet"]')).toBeNull();
    expect(only()).toMatchObject({ checkPresses: 0, outcome: 'abandoned' });
  });

  it('pointing at the faulty device opens it, and fixing it on the first Check is a clean solve', async () => {
    const { screen, only } = open();
    await screen.click(`exercise-suspect-${faulty}`);
    expect(screen.get('exercise-suspect-step').textContent).toContain('直して「たしかめる」');
    expect(screen.find(`${card(faulty ?? '')}-input`)).not.toBeNull();
    for (const id of healthy) expect(screen.find(`${card(id)}-input`)).toBeNull();
    await pressUsableChip(screen);
    await check(screen);
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('true');
    expect(only()).toMatchObject({ outcome: 'passed', checkPresses: 1 });
    expect(isSolved(only())).toBe(true);
  });

  // TC-604
  it('pointing is a selection: it costs nothing and can be changed until Check, and what was changed goes back', async () => {
    const { screen, only } = open();
    await screen.click(`exercise-suspect-${healthy[0]}`);
    // The device pointed at opens; the others can still be pointed at instead.
    expect(screen.find(`${card(healthy[0] ?? '')}-input`)).not.toBeNull();
    expect(screen.find(`exercise-suspect-${faulty}`)).not.toBeNull();
    expect(only()).toMatchObject({ checkPresses: 0 });
    await screen.click('exercise-chip-0');
    const before = exercise!.start.nodes.find((node) => node.id === healthy[0])?.data.ip ?? 'x';

    await screen.click(`exercise-suspect-${faulty}`);
    expect(screen.find(`${card(faulty ?? '')}-input`)).not.toBeNull();
    expect(screen.get(`${card(healthy[0] ?? '')}-current`).textContent).toContain(before);
    expect(only()).toMatchObject({ checkPresses: 0 });
    await pressUsableChip(screen);
    await check(screen);
    expect(isSolved(only())).toBe(true);
  });

  // TC-604
  it('Check with a healthy device pointed at says only that it is fine and what to compare, and costs the clean solve', async () => {
    const { screen, only } = open();
    await screen.click(`exercise-suspect-${healthy[0]}`);
    await screen.click('exercise-chip-0');
    await screen.click('exercise-check');
    const note = screen.get(`exercise-suspect-note-${healthy[0]}`).textContent ?? '';
    expect(note).toContain(
      'この機器のアドレスは、まわりと合っています。ほかの 2 台を、となりの機器と見くらべてください。',
    );
    expect(note).toContain('何度かためして解けた');
    // It does not say which of the other two it is; the device is shut and as it was.
    const faultyLabel = exercise!.nodeLabels?.[faulty ?? '']?.ja ?? 'x';
    expect(note).not.toContain(faultyLabel);
    expect(screen.find(`${card(healthy[0] ?? '')}-input`)).toBeNull();
    expect(screen.get(`${card(healthy[0] ?? '')}-current`).textContent).toContain(
      exercise!.start.nodes.find((node) => node.id === healthy[0])?.data.ip ?? 'x',
    );
    // No goal was graded: nothing says which device cannot reach the server.
    expect(screen.get('exercise-result').hasAttribute('data-passed')).toBe(false);
    expect(only()).toMatchObject({ checkPresses: 1, failedCheckIds: ['suspect'] });
    // A hint is offered now, as after any miss.
    expect(screen.find('exercise-hint')).not.toBeNull();

    await screen.click(`exercise-suspect-${faulty}`);
    await pressUsableChip(screen);
    await check(screen);
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('true');
    expect(screen.get('exercise-result-done').getAttribute('data-counted')).toBe('tries');
    expect(isSolved(only())).toBe(false);
    expect(isSolvedAfterTries(only())).toBe(true);
  });

  it('a press on the device in the diagram points at it too', async () => {
    const { screen } = open();
    await screen.click(`stub-node-${faulty}`);
    expect(screen.find(`${card(faulty ?? '')}-input`)).not.toBeNull();
  });

  // TC-590
  it('a changed setting has its own "put this one back", which restores what it started with', async () => {
    const { screen } = open();
    const before = screen.get(`${card(faulty ?? '')}-current`).textContent;
    await screen.click(`exercise-suspect-${faulty}`);
    expect(screen.find(`${card(faulty ?? '')}-undo`)).toBeNull();
    expect(screen.find('exercise-reset')).toBeNull();
    await screen.click('exercise-chip-0');
    // The whole-exercise reset is beside Check, not a link above the form.
    expect(screen.get('exercise-actions').contains(screen.get('exercise-reset'))).toBe(true);
    await screen.click(`${card(faulty ?? '')}-undo`);
    expect(screen.find(`${card(faulty ?? '')}-undo`)).toBeNull();
    await screen.click(`exercise-suspect-${healthy[0]}`);
    expect(screen.get(`${card(faulty ?? '')}-current`).textContent).toBe(before);
  });
});

// TC-605
describe('the router with a wrong address on one side: choose the side first', () => {
  const router = exerciseById('l1-router-address~0', 'ja');
  if (!router?.pickFirst) throw new Error('l1-router-address~0 has no pickFirst');
  const [wrongSide] = router.pickFirst.faulty;
  const otherSide = ['r1:lan', 'r1:far'].find((key) => key !== wrongSide) ?? '';
  const sideCard = (key: string) => `exercise-setting-iface-address-${key.replace(':', '-')}`;

  function openRouter() {
    const store = testStore();
    screen = render(<ExerciseRunner exercise={router!} store={store} />, { locale: 'ja' });
    return { screen, only: () => store.getState().attempts[0]! };
  }

  it('neither side can be changed until one is chosen, and both show their address', () => {
    const { screen } = openRouter();
    expect(screen.get('exercise-suspect-step').textContent).toContain('側を えらんでください');
    for (const key of [wrongSide ?? '', otherSide]) {
      expect(screen.get(`${sideCard(key)}-current`).textContent).toMatch(/\d+\.\d+\.\d+\.\d+/);
      expect(screen.find(`exercise-suspect-${key}`)).not.toBeNull();
    }
    expect(screen.find('exercise-chip-0')).toBeNull();
  });

  it('the healthy side chosen and checked is a miss; the wrong side can then be chosen, and the solve is not clean', async () => {
    const { screen, only } = openRouter();
    await screen.click(`exercise-suspect-${otherSide}`);
    await screen.click('exercise-chip-0');
    await screen.click('exercise-check');
    expect(screen.get(`exercise-suspect-note-${otherSide}`).textContent).toContain(
      'こちら側のアドレスは、つながっている機器と合っています。',
    );
    expect(only()).toMatchObject({ checkPresses: 1, failedCheckIds: ['suspect'] });
    expect(screen.find(`exercise-suspect-${wrongSide}`)).not.toBeNull();
  });

  it('the side can be changed before Check without cost', async () => {
    const { screen, only } = openRouter();
    await screen.click(`exercise-suspect-${otherSide}`);
    await screen.click(`exercise-suspect-${wrongSide}`);
    expect(screen.get(sideCard(wrongSide ?? '')).hasAttribute('data-picked')).toBe(true);
    expect(screen.find(`exercise-suspect-${otherSide}`)).not.toBeNull();
    expect(only()).toMatchObject({ checkPresses: 0 });
  });
});
