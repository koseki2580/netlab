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

// TC-589
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
    expect(screen.get('exercise-count-rule').textContent).toContain('1 回目で正しい機器をえらび');
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

  it('pointing at the faulty device opens it alone, and fixing it on the first Check is a clean solve', async () => {
    const { screen, only } = open();
    await screen.click(`exercise-suspect-${faulty}`);
    expect(screen.get('exercise-suspect-step').textContent).toContain('直してください');
    expect(screen.find(`${card(faulty ?? '')}-input`)).not.toBeNull();
    for (const id of healthy) {
      expect(screen.find(`${card(id)}-input`)).toBeNull();
      expect(screen.find(`exercise-suspect-${id}`)).toBeNull();
    }
    await pressUsableChip(screen);
    await check(screen);
    expect(screen.get('exercise-result').getAttribute('data-passed')).toBe('true');
    expect(only()).toMatchObject({ outcome: 'passed', checkPresses: 1 });
    expect(isSolved(only())).toBe(true);
  });

  it('pointing at a healthy device says only that it is fine and what to compare, and costs the clean solve', async () => {
    const { screen, only } = open();
    await screen.click(`exercise-suspect-${healthy[0]}`);
    const note = screen.get(`exercise-suspect-note-${healthy[0]}`).textContent ?? '';
    expect(note).toContain(
      'この機器のアドレスは、まわりと合っています。ほかの 2 台を、となりの機器と見くらべてください。',
    );
    expect(note).toContain('何度かためして解けた');
    // It does not say which of the other two it is, and the device stays shut.
    const faultyLabel = exercise!.nodeLabels?.[faulty ?? '']?.ja ?? 'x';
    expect(note).not.toContain(faultyLabel);
    expect(screen.find(`${card(healthy[0] ?? '')}-input`)).toBeNull();
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
    await screen.click(`exercise-suspect-${faulty}`);
    const before = screen.get(`${card(faulty ?? '')}-current`).textContent;
    expect(screen.find(`${card(faulty ?? '')}-undo`)).toBeNull();
    expect(screen.find('exercise-reset')).toBeNull();
    await screen.click('exercise-chip-0');
    expect(screen.get(`${card(faulty ?? '')}-current`).textContent).not.toBe(before);
    // The whole-exercise reset is beside Check, not a link above the form.
    expect(screen.get('exercise-actions').contains(screen.get('exercise-reset'))).toBe(true);
    await screen.click(`${card(faulty ?? '')}-undo`);
    expect(screen.get(`${card(faulty ?? '')}-current`).textContent).toBe(before);
    expect(screen.find(`${card(faulty ?? '')}-undo`)).toBeNull();
  });
});
