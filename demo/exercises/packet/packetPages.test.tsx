/* @vitest-environment jsdom */
/**
 * TC-740 to TC-755 — the packet track's pages: the store keeps the two tracks
 * apart, the hub and a level say where the learner stands, and an exercise is
 * filled in, checked on the real simulator, explained and recorded.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exerciseById } from '../../packet-lab/templates';
import type {
  BuildExercise,
  FragmentExercise,
  PacketExercise,
  ReadExercise,
} from '../../packet-lab/model';
import { ExerciseHubBody } from '../ExerciseHub';
import { levelSummary, PACKET_TRACK_PREFIX } from '../store/estimate';
import { attempt } from '../store/testSupport';
import { render, testStore, type Screen } from '../ui/testSupport';
import { referenceDraft } from './answers';
import { diagramFacts } from './diagramFacts';
import { inAttemptOrder } from './PacketForm';
import { PacketExerciseBody, PacketHubBody, PacketLevelBody } from './PacketPages';
import { answeredByPicks, packetSummary, tracked } from './packetSource';

vi.mock('../ui/ExerciseDiagram', () => ({
  DiagramLegend: () => null,
  ExerciseDiagram: () => <div data-testid="diagram-stub" />,
}));

let screen: Screen | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

function packet<T extends PacketExercise>(id: string): T {
  const found = exerciseById(id);
  if (!found) throw new Error(`no packet exercise ${id}`);
  return found as T;
}

function open(id: string, store = testStore(), locale: 'ja' | 'en' = 'ja') {
  screen = render(<PacketExerciseBody store={store} />, {
    locale,
    path: `/exercises/packet/do/${id}`,
    route: '/exercises/packet/do/:exerciseId',
  });
  return { screen, store };
}

async function checkAndWait(view: Screen) {
  await view.click('packet-check');
  await view.until(() => view.find('packet-result') !== null);
}

const rows = (view: Screen) =>
  [...view.container.querySelectorAll<HTMLElement>('[data-testid="packet-result-row"]')].map(
    (row) => ({
      goal: row.dataset.goal,
      code: row.dataset.code,
      passed: row.dataset.passed === 'true',
      text: row.textContent ?? '',
    }),
  );

/** A solved packet attempt, as the store would hold it. */
function packetSolved(exerciseId: string, startedAt: number) {
  const exercise = packet(exerciseId);
  return attempt(tracked(exercise.templateId), exercise.seed, exercise.level, {
    kind: exercise.kind,
    startedAt,
    id: `${tracked(exerciseId)}@${startedAt}`,
  });
}

describe('one store, two tracks', () => {
  it('TC-740: keeps a packet attempt (prefixed ids, packet kind) through a save and a load', () => {
    const store = testStore();
    const result = store.importJson(
      JSON.stringify({ version: 1, attempts: [packetSolved('p1-send-to~0', 5000)], cycles: [] }),
    );
    expect(result).toMatchObject({ ok: true, attempts: 1 });
    const [kept] = store.getState().attempts;
    expect(kept?.exerciseId).toBe(`${PACKET_TRACK_PREFIX}p1-send-to~0`);
    expect(kept?.kind).toBe('build-packet');
  });

  it('TC-741: a device level never counts a packet attempt, and a packet level never counts a device one', () => {
    const packets = ['p1-send-to~0', 'p1-where~0', 'p1-which~0', 'p1-send-to~1', 'p1-where~1'].map(
      (id, index) => packetSolved(id, 1000 * (index + 1)),
    );
    const device = attempt('l1-host-address', 0, 1, { startedAt: 9000 });
    const all = [...packets, device];
    expect(levelSummary(all, 1).counted).toBe(1);
    expect(packetSummary(all, 1).counted).toBe(5);
    expect(packetSummary(all, 1).solved).toBe(5);
  });
});

describe('the packet hub', () => {
  it('TC-742: is linked from the exercises hub', () => {
    screen = render(<ExerciseHubBody store={testStore()} />);
    expect(screen.get('exercises-packet-link').getAttribute('href')).toBe('/exercises/packet');
  });

  it('TC-742: shows four levels, each with where the learner stands and a way to the next packet exercise', () => {
    screen = render(<PacketHubBody store={testStore()} />);
    for (const level of [1, 2, 3, 4]) {
      expect(screen.get(`packet-level-headline-${level}`).dataset.status).toBe('not-enough');
      expect(screen.get(`packet-start-${level}`).getAttribute('href')).toMatch(
        /^\/exercises\/packet\/do\/p\d-/,
      );
    }
  });
});

describe('a packet level', () => {
  it('TC-743: counts the exercises solved there, and only those', () => {
    const store = testStore();
    store.importJson(
      JSON.stringify({ version: 1, attempts: [packetSolved('p2-port~0', 2000)], cycles: [] }),
    );
    screen = render(<PacketLevelBody store={store} />, {
      path: '/exercises/packet/level/2',
      route: '/exercises/packet/level/:level',
    });
    expect(screen.get('packet-level-headline-2').dataset.counted).toBe('1');
    expect(screen.get('packet-level-headline-2').dataset.solved).toBe('1');
    expect(screen.find('packet-level-record-item')).not.toBeNull();
    expect(screen.get('packet-level-kinds').children.length).toBeGreaterThanOrEqual(4);
  });
});

describe('a build exercise', () => {
  it('TC-744: is solved by writing the destination address read off the diagram, and the attempt is recorded', async () => {
    const exercise = packet<BuildExercise>('p1-send-to~0');
    const { screen: view, store } = open(exercise.id);
    await view.enter('packet-field-dstIp', String(exercise.reference.dstIp));
    await checkAndWait(view);
    expect(view.get('packet-result').dataset.passed).toBe('true');
    const [record] = store.getState().attempts;
    expect(record).toMatchObject({
      exerciseId: tracked(exercise.id),
      templateId: tracked(exercise.templateId),
      outcome: 'passed',
      checkPresses: 1,
      kind: 'build-packet',
    });
    expect(view.find('packet-next')).not.toBeNull();
  });

  it('TC-745: a TTL one short is told as such: which router, and the rule', async () => {
    const exercise = Array.from({ length: 20 }, (_, seed) =>
      packet<BuildExercise>(`p2-smallest-ttl~${seed}`),
    ).find((entry) =>
      entry.fields[0]?.candidates?.some((option) => option.why.startsWith('dies-at-r')),
    );
    if (!exercise) throw new Error('no instance with a value one short');
    const { screen: view } = open(exercise.id);
    const short = Number(exercise.reference.ttl) - 1;
    await view.click(`packet-field-ttl-option-${short}`);
    await checkAndWait(view);
    const failed = rows(view).filter((row) => !row.passed);
    expect(failed[0]?.code).toBe('ttl-ran-out');
    expect(failed[0]?.text).toContain('TTL が足りず');
    expect(failed[0]?.text).toContain('ルータを 1 台越えるたびに 1 ずつ減ります');
  });

  it('TC-746: Check with nothing entered, or with a box that is not a number, judges nothing and records nothing', async () => {
    const exercise = packet<BuildExercise>('p2-die-at~0');
    const { screen: view, store } = open(exercise.id);
    await view.click('packet-check');
    expect(view.get('packet-refused').dataset.reason).toBe('nothing');
    await view.enter('packet-field-ttl', '3x');
    await view.click('packet-check');
    expect(view.get('packet-refused').dataset.reason).toBe('draft');
    expect(view.find('packet-field-ttl-draft')).not.toBeNull();
    expect(store.getState().attempts[0]?.checkPresses).toBe(0);
  });
});

describe('a fragment exercise', () => {
  it('TC-747: is solved by stating the pieces row by row', async () => {
    const exercise = packet<FragmentExercise>('p3-fragment~0');
    const { screen: view } = open(exercise.id);
    for (const [index, row] of exercise.reference.entries()) {
      await view.click('fragment-add');
      await view.enter(`fragment-size-${index + 1}`, String(row.size));
    }
    await checkAndWait(view);
    expect(view.get('packet-result').dataset.passed).toBe('true');
  });

  it('TC-748: the IP header left out of every piece is told by its own message', async () => {
    const exercise = packet<FragmentExercise>('p4-fragment~0');
    const { screen: view } = open(exercise.id);
    for (const [index, row] of exercise.reference.entries()) {
      await view.click('fragment-add');
      await view.enter(`fragment-size-${index + 1}`, String(row.size - 20));
      await view.enter(`fragment-offset-${index + 1}`, String(row.offset));
      if (row.mf) await view.click(`fragment-mf-${index + 1}`);
    }
    await checkAndWait(view);
    const sizes = rows(view).find((row) => row.goal === 'sizes');
    expect(sizes?.code).toBe('ip-header-forgotten');
    expect(sizes?.text).toContain('IP ヘッダの 20 バイトが入っていません');
  });
});

describe('a read exercise with a correction', () => {
  it('TC-749: is judged at one Check, its reading and its correction told apart', async () => {
    const exercise = packet<ReadExercise>('p3-df-read~0');
    const { screen: view } = open(exercise.id);
    const [question] = exercise.questions;
    const wrong = question?.candidates.find((candidate) => candidate.why !== 'right');
    if (!question || !wrong) throw new Error('no wrong candidate');
    await view.click(`packet-pick-${question.id}-option-${String(wrong.value)}`);
    await view.enter('packet-field-size', String(exercise.fix?.reference.size));
    await checkAndWait(view);
    const reading = view.get('packet-result-questions').textContent ?? '';
    const fix = view.get('packet-result-fix');
    expect(reading).toContain('✗');
    expect(fix.querySelectorAll('[data-passed="false"]')).toHaveLength(0);
    expect(view.get('packet-result').dataset.passed).toBe('false');
  });
});

describe('what is said beside the diagram', () => {
  it('TC-750: MAC addresses where a MAC is the question, the MTU where a cable has one, the list where a router has one', () => {
    expect(diagramFacts(packet('p2-first-mac~0')).macs.length).toBeGreaterThan(0);
    expect(diagramFacts(packet('p1-send-to~0'))).toEqual({ macs: [], mtus: [], lists: [] });
    expect(diagramFacts(packet('p3-df~0')).mtus).toHaveLength(1);
    expect(diagramFacts(packet('p2-port~0')).lists).toHaveLength(2);
  });

  it('TC-750: the page shows them only on such an exercise', () => {
    open('p1-send-to~0');
    expect(screen?.find('packet-facts')).toBeNull();
    screen?.unmount();
    open('p2-first-mac~0');
    expect(screen?.find('packet-facts-macs')).not.toBeNull();
  });
});

describe('the replay in words', () => {
  it('TC-751: lists each hop with the TTL it arrived with, the note a router sent back marked as such', async () => {
    const exercise = packet<BuildExercise>('p2-die-at~0');
    const { screen: view } = open(exercise.id);
    await view.enter('packet-field-ttl', String(exercise.reference.ttl));
    await checkAndWait(view);
    const hops = [...view.container.querySelectorAll<HTMLElement>('[data-testid="packet-hop"]')];
    expect(hops.length).toBeGreaterThan(2);
    const sent = Number(exercise.reference.ttl);
    expect(hops[0]?.textContent).toContain(`送り出したときの TTL ${sent}`);
    // The next device is the first router: it is reached with the TTL the packet left with.
    expect(hops[1]?.textContent).toContain(`着いたときの TTL ${sent}`);
    expect(hops.some((hop) => hop.dataset.note === 'true')).toBe(true);
    expect(view.container.textContent).not.toMatch(/返事|返信/);
  });
});

describe('how a solve counts', () => {
  it('TC-752: an exercise answered by picks counts on the first Check only; a typed one within two', () => {
    expect(answeredByPicks(packet('p2-smallest-ttl~0'))).toBe(true);
    expect(answeredByPicks(packet('p1-where~0'))).toBe(true);
    expect(answeredByPicks(packet('p1-send-to~0'))).toBe(false);
    expect(answeredByPicks(packet('p3-fragment~0'))).toBe(false);
    const { store } = open('p1-where~0');
    expect(store.getState().attempts[0]?.checksToCount).toBe(1);
  });

  it('TC-753: a hint and a shown answer are recorded, and the shown answer is filled in', async () => {
    const exercise = packet<BuildExercise>('p1-send-to~0');
    const { screen: view, store } = open(exercise.id);
    await view.click('packet-hint');
    expect(view.find('packet-hint-1')).not.toBeNull();
    await view.click('packet-reveal');
    const record = store.getState().attempts[0];
    expect(record).toMatchObject({ hintsUsed: 1, revealed: true, outcome: 'gave-up' });
    expect((view.get('packet-field-dstIp') as HTMLInputElement).value).toBe(
      String(referenceDraft(exercise).values.dstIp),
    );
  });
});

describe('the order of what is offered', () => {
  it('TC-754: turns with the attempt, so a place gives nothing away, and keeps every candidate', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(inAttemptOrder(items, 0)).toEqual(items);
    expect(inAttemptOrder(items, 5)).toEqual(['b', 'c', 'd', 'a']);
    expect([...inAttemptOrder(items, 7)].sort()).toEqual(items);
  });
});

describe('both languages, and a wrong address', () => {
  it('TC-755: in English the devices and the task are in English', () => {
    open('p1-send-to~0', testStore(), 'en');
    expect(screen?.get('packet-task').textContent).toMatch(/Write the destination address/);
  });

  it('TC-755: an id that is not an exercise says so', () => {
    open('no-such~0');
    expect(screen?.find('packet-exercise-missing')).not.toBeNull();
  });
});
