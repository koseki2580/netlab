import { describe, expect, it } from 'vitest';
import { createSafeProgressStorage, type SafeProgressStorage } from '../../../src/progress/storage';
import {
  MAX_ATTEMPTS,
  createAttemptStore,
  exerciseStoreKey,
  parseExerciseState,
  type AttemptMeta,
} from './attemptStore';
import { startCycle } from './studyCycle';
import { attempt } from './testSupport';
import type { ExerciseStoreState } from './types';

const LEARNER = 'local-abc123';
const KEY = exerciseStoreKey(LEARNER);

/** An in-memory storage whose reads and writes can be made to throw. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const faults = { read: false, write: false };
  const storage: SafeProgressStorage = createSafeProgressStorage({
    getItem(key) {
      if (faults.read) throw new Error('read blocked');
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      if (faults.write) throw new Error('quota');
      data.set(key, value);
    },
    removeItem(key) {
      if (faults.write) throw new Error('quota');
      data.delete(key);
    },
  });
  return { storage, data, faults };
}

function clock(start = 1000) {
  let time = start;
  return () => (time += 10);
}

const meta = (templateId = 'l1-host-address', seed = 0): AttemptMeta => ({
  id: `${templateId}~${seed}`,
  templateId,
  level: 1,
  kind: 'configure',
  generatorVersion: 1,
  locale: 'ja',
});

function newStore(memory = memoryStorage()) {
  const store = createAttemptStore({ learnerId: LEARNER, storage: memory.storage, now: clock() });
  return { store, ...memory };
}

const only = (state: ExerciseStoreState) => {
  expect(state.attempts).toHaveLength(1);
  return state.attempts[0]!;
};

const fail = { passed: false, failedCheckIds: ['reach-1'], changedSettings: 1 };
const pass = { passed: true, failedCheckIds: [], changedSettings: 2 };

describe('key', () => {
  it('is per learner under the v1 prefix', () => {
    expect(KEY).toBe('netlab-exercises:v1:local-abc123');
  });
});

describe('open', () => {
  it('writes an abandoned record at once, so leaving without checking still counts', () => {
    const { store, data } = newStore();
    const id = store.open(meta(), 'practice');

    expect(only(store.getState())).toEqual({
      id,
      exerciseId: 'l1-host-address~0',
      templateId: 'l1-host-address',
      level: 1,
      kind: 'configure',
      context: 'practice',
      startedAt: 1010,
      outcome: 'abandoned',
      checkPresses: 0,
      firstCheckPassed: false,
      failedCheckIds: [],
      hintsUsed: 0,
      revealed: false,
      changedSettings: 0,
      locale: 'ja',
      generatorVersion: 1,
    });
    expect(JSON.parse(data.get(KEY) ?? '')).toEqual(store.getState());
  });

  it('keeps the cycle id of a before/after attempt', () => {
    const { store } = newStore();
    store.open(meta(), 'pre', 'cycle-1-5');
    expect(only(store.getState())).toMatchObject({ context: 'pre', cycleId: 'cycle-1-5' });
  });

  it('gives two attempts opened at the same instant different ids', () => {
    const memory = memoryStorage();
    const store = createAttemptStore({ learnerId: LEARNER, storage: memory.storage, now: () => 5 });
    const ids = [store.open(meta(), 'practice'), store.open(meta(), 'practice')];
    expect(new Set(ids).size).toBe(2);
    expect(store.getState().attempts.map((entry) => entry.id)).toEqual(ids);
  });
});

describe('recordCheck', () => {
  it('counts failed presses and leaves the attempt abandoned', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordCheck(id, fail);
    store.recordCheck(id, {
      passed: false,
      failedCheckIds: ['reach-2', 'reach-1'],
      changedSettings: 3,
    });

    expect(only(store.getState())).toMatchObject({
      outcome: 'abandoned',
      checkPresses: 2,
      firstCheckPassed: false,
      failedCheckIds: ['reach-1', 'reach-2'],
      changedSettings: 3,
      endedAt: 1030,
    });
  });

  it('marks a pass, and remembers that the first press did not pass', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordCheck(id, fail);
    store.recordCheck(id, pass);

    expect(only(store.getState())).toMatchObject({
      outcome: 'passed',
      checkPresses: 2,
      firstCheckPassed: false,
      failedCheckIds: ['reach-1'],
      changedSettings: 2,
    });
  });

  it('records a pass on the first press', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordCheck(id, pass);
    expect(only(store.getState())).toMatchObject({
      outcome: 'passed',
      checkPresses: 1,
      firstCheckPassed: true,
    });
  });

  it('changes nothing after a pass', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordCheck(id, pass);
    const passed = store.getState();

    store.recordCheck(id, fail);
    store.recordHint(id, 3);
    store.recordReveal(id);
    store.recordPrediction(id, { optionId: 'a', predicted: 'reach', correct: false });

    expect(store.getState()).toBe(passed);
  });

  it('does nothing for an unknown attempt id', () => {
    const { store } = newStore();
    store.open(meta(), 'practice');
    const before = store.getState();
    store.recordCheck('nope', pass);
    store.recordHint('nope', 1);
    store.recordReveal('nope');
    expect(store.getState()).toBe(before);
  });
});

describe('recordReveal', () => {
  it('marks the attempt as given up', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordCheck(id, fail);
    store.recordReveal(id);
    expect(only(store.getState())).toMatchObject({ outcome: 'gave-up', revealed: true });
  });

  it('does not let a pass after the reveal count as a pass', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordReveal(id);
    store.recordCheck(id, pass);
    expect(only(store.getState())).toMatchObject({
      outcome: 'gave-up',
      revealed: true,
      checkPresses: 0,
      firstCheckPassed: false,
    });
  });
});

describe('recordHint', () => {
  it('keeps the highest tier opened', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordHint(id, 2);
    store.recordHint(id, 1);
    expect(only(store.getState()).hintsUsed).toBe(2);
    store.recordHint(id, 3);
    expect(only(store.getState()).hintsUsed).toBe(3);
  });
});

describe('recordPrediction', () => {
  it('keeps what the learner predicted', () => {
    const { store } = newStore();
    const id = store.open({ ...meta('l1-choose-cable'), kind: 'choose-design' }, 'practice');
    store.recordPrediction(id, { optionId: 'opt-b', predicted: 'no-reach', correct: true });
    expect(only(store.getState()).prediction).toEqual({
      optionId: 'opt-b',
      predicted: 'no-reach',
      correct: true,
    });
  });
});

describe('persistence', () => {
  it('round-trips through storage exactly', () => {
    const memory = memoryStorage();
    const first = createAttemptStore({ learnerId: LEARNER, storage: memory.storage, now: clock() });
    const a = first.open(meta('l1-a', 0), 'placement');
    first.recordHint(a, 1);
    first.recordCheck(a, fail);
    first.recordCheck(a, pass);
    const b = first.open({ ...meta('l1-b', 7), kind: 'choose-design' }, 'pre', 'cycle-1-1');
    first.recordPrediction(b, { optionId: 'o', predicted: 'detour', correct: false });
    first.recordReveal(b);
    first.saveCycle(startCycle(1, ['l1-a', 'l1-b'], 1));
    first.setPlacement({ level: 2, exercises: 6, completedAt: 99 });

    const second = createAttemptStore({ learnerId: LEARNER, storage: memory.storage });
    expect(second.getState()).toEqual(first.getState());
    expect(second.status()).toEqual({ persistence: 'storage' });
    expect(JSON.parse(JSON.stringify(first.getState()))).toEqual(first.getState());
  });

  it('keeps learners apart', () => {
    const memory = memoryStorage();
    createAttemptStore({ learnerId: LEARNER, storage: memory.storage }).open(meta(), 'practice');
    const other = createAttemptStore({ learnerId: 'someone-else', storage: memory.storage });
    expect(other.getState().attempts).toEqual([]);
  });

  it('starts empty when nothing is stored', () => {
    const { store } = newStore();
    expect(store.getState()).toEqual({ version: 1, attempts: [], cycles: [] });
    expect(store.status()).toEqual({ persistence: 'storage' });
  });

  it.each([
    ['garbage', '{not json'],
    ['a JSON string', '"hello"'],
    ['a list', '[1,2]'],
    ['no version', '{"attempts":[]}'],
    ['an older version', '{"version":0,"attempts":[]}'],
  ])('starts empty over %s and replaces it on the first change', (_name, raw) => {
    const { store, data } = newStore(memoryStorage({ [KEY]: raw }));
    expect(store.getState().attempts).toEqual([]);
    expect(store.status()).toEqual({ persistence: 'storage' });

    store.open(meta(), 'practice');
    expect(JSON.parse(data.get(KEY) ?? '')).toEqual(store.getState());
  });

  it('tolerates wrong types where the lists should be', () => {
    const raw = JSON.stringify({ version: 1, attempts: 'many', cycles: 7, placement: 'high' });
    const { store } = newStore(memoryStorage({ [KEY]: raw }));
    expect(store.getState()).toEqual({ version: 1, attempts: [], cycles: [] });
  });

  it('drops invalid records one by one and keeps the rest', () => {
    const good = [attempt('a', 0, 1), attempt('b', 1, 2)];
    const raw = JSON.stringify({
      version: 1,
      attempts: [
        good[0],
        null,
        'text',
        { ...attempt('c', 2, 1), level: 9 },
        { ...attempt('c', 3, 1), hintsUsed: 4 },
        { ...attempt('c', 4, 1), outcome: 'won' },
        { ...attempt('c', 5, 1), failedCheckIds: [1] },
        { ...attempt('c', 6, 1), startedAt: 'yesterday' },
        { ...attempt('c', 7, 1), prediction: { optionId: 'o' } },
        { ...good[0] },
        good[1],
      ],
      cycles: [startCycle(1, ['a'], 1), { id: 'broken' }],
      placement: { level: 7, exercises: 2, completedAt: 1 },
    });

    const parsed = parseExerciseState(raw);
    expect(parsed).toEqual({
      kind: 'ok',
      state: { version: 1, attempts: good, cycles: [startCycle(1, ['a'], 1)] },
      dropped: 11,
    });

    const { store } = newStore(memoryStorage({ [KEY]: raw }));
    expect(store.getState().attempts).toEqual(good);
  });

  it('does not keep fields it does not know', () => {
    const raw = JSON.stringify({
      version: 1,
      attempts: [{ ...attempt('a', 0, 1), extra: 'x' }],
      cycles: [],
      extra: true,
    });
    const { store } = newStore(memoryStorage({ [KEY]: raw }));
    expect(only(store.getState())).not.toHaveProperty('extra');
    expect(store.getState()).not.toHaveProperty('extra');
  });

  it('leaves data from a newer version untouched and runs in memory', () => {
    const raw = JSON.stringify({ version: 2, attempts: [{ shape: 'unknown' }] });
    const { store, data } = newStore(memoryStorage({ [KEY]: raw }));

    expect(store.status()).toEqual({ persistence: 'memory', reason: 'future-version' });
    expect(store.getState().attempts).toEqual([]);

    const id = store.open(meta(), 'practice');
    store.recordCheck(id, pass);
    store.clear();
    store.open(meta(), 'practice');

    expect(store.getState().attempts).toHaveLength(1);
    expect(data.get(KEY)).toBe(raw);
    expect(store.status()).toEqual({ persistence: 'memory', reason: 'future-version' });
  });

  it.each([
    ['no learner id', null],
    ['an empty learner id', ''],
    ['a learner id that cannot be a key', 'a b/c'],
  ])('runs in memory with %s', (_name, learnerId) => {
    const memory = memoryStorage();
    const store = createAttemptStore({ learnerId, storage: memory.storage, now: clock() });

    expect(store.status()).toEqual({ persistence: 'memory', reason: 'no-learner' });
    const id = store.open(meta(), 'practice');
    store.recordCheck(id, pass);
    expect(only(store.getState()).outcome).toBe('passed');
    expect(memory.data.size).toBe(0);
  });

  it('runs in memory when there is no storage', () => {
    const store = createAttemptStore({ learnerId: LEARNER, storage: null, now: clock() });
    expect(store.status()).toEqual({ persistence: 'memory', reason: 'unavailable' });
    store.open(meta(), 'practice');
    expect(store.getState().attempts).toHaveLength(1);
  });

  it('runs in memory without a browser when no storage is given', () => {
    const store = createAttemptStore({ learnerId: LEARNER });
    expect(store.status()).toEqual({ persistence: 'memory', reason: 'unavailable' });
  });

  it('runs in memory when reading throws, and does not write over what it could not read', () => {
    const memory = memoryStorage({ [KEY]: 'unreadable' });
    memory.faults.read = true;
    const store = createAttemptStore({ learnerId: LEARNER, storage: memory.storage, now: clock() });

    expect(store.status()).toEqual({ persistence: 'memory', reason: 'unavailable' });
    store.open(meta(), 'practice');
    expect(store.getState().attempts).toHaveLength(1);
    expect(memory.data.get(KEY)).toBe('unreadable');
  });

  it('keeps working when a write throws, and says so', () => {
    const { store, data, faults } = newStore();
    const first = store.open(meta('a', 0), 'practice');
    const stored = data.get(KEY);

    faults.write = true;
    store.recordCheck(first, pass);
    store.open(meta('b', 1), 'practice');

    expect(store.status()).toEqual({ persistence: 'memory', reason: 'write-failed' });
    expect(store.getState().attempts).toHaveLength(2);
    expect(store.getState().attempts[0]?.outcome).toBe('passed');
    expect(data.get(KEY)).toBe(stored);
  });

  it('writes everything once storage accepts writes again', () => {
    const { store, data, faults } = newStore();
    faults.write = true;
    store.open(meta('a', 0), 'practice');
    faults.write = false;
    store.open(meta('b', 1), 'practice');

    expect(store.status()).toEqual({ persistence: 'storage' });
    expect(JSON.parse(data.get(KEY) ?? '')).toEqual(store.getState());
    expect(store.getState().attempts).toHaveLength(2);
  });
});

describe('cap', () => {
  it(`keeps the newest ${MAX_ATTEMPTS} attempts`, () => {
    const attempts = Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
      attempt('a', i, 1, { id: `old-${i}`, startedAt: i }),
    );
    const raw = JSON.stringify({ version: 1, attempts, cycles: [] });
    const { store, data } = newStore(memoryStorage({ [KEY]: raw }));
    expect(store.getState().attempts).toHaveLength(MAX_ATTEMPTS);

    const id = store.open(meta('b', 0), 'practice');

    const kept = store.getState().attempts;
    expect(kept).toHaveLength(MAX_ATTEMPTS);
    expect(kept[0]?.id).toBe('old-1');
    expect(kept[kept.length - 1]?.id).toBe(id);
    expect((JSON.parse(data.get(KEY) ?? '') as ExerciseStoreState).attempts).toHaveLength(
      MAX_ATTEMPTS,
    );
  });

  it('applies to stored and imported data too', () => {
    const attempts = Array.from({ length: MAX_ATTEMPTS + 5 }, (_, i) =>
      attempt('a', i, 1, { id: `old-${i}`, startedAt: i }),
    );
    const raw = JSON.stringify({ version: 1, attempts, cycles: [] });

    const { store } = newStore(memoryStorage({ [KEY]: raw }));
    expect(store.getState().attempts).toHaveLength(MAX_ATTEMPTS);
    expect(store.getState().attempts[0]?.id).toBe('old-5');

    const fresh = newStore().store;
    expect(fresh.importJson(raw)).toEqual({ ok: true, attempts: MAX_ATTEMPTS, dropped: 0 });
  });
});

describe('subscribe', () => {
  it('tells listeners about every change, with a new state object each time', () => {
    const { store } = newStore();
    const seen: ExerciseStoreState[] = [];
    store.subscribe(() => seen.push(store.getState()));

    const id = store.open(meta(), 'practice');
    store.recordHint(id, 1);
    store.recordCheck(id, pass);
    store.clear();

    expect(seen).toHaveLength(4);
    expect(new Set(seen).size).toBe(4);
    expect(seen[2]?.attempts[0]).toMatchObject({ outcome: 'passed', hintsUsed: 1 });
    expect(seen[3]?.attempts).toEqual([]);
  });

  it('stays quiet when nothing changed', () => {
    const { store } = newStore();
    const id = store.open(meta(), 'practice');
    store.recordCheck(id, pass);
    let calls = 0;
    store.subscribe(() => (calls += 1));

    store.recordCheck(id, fail);
    store.recordHint('nope', 1);
    store.importJson('not json');

    expect(calls).toBe(0);
  });

  it('stops after unsubscribing', () => {
    const { store } = newStore();
    let calls = 0;
    const stop = store.subscribe(() => (calls += 1));
    store.open(meta('a', 0), 'practice');
    stop();
    store.open(meta('b', 1), 'practice');
    expect(calls).toBe(1);
  });
});

describe('cycles and placement', () => {
  it('adds a cycle and replaces it by id', () => {
    const { store } = newStore();
    const cycle = startCycle(1, ['a', 'b'], 1);
    store.saveCycle(cycle);
    store.saveCycle({ ...cycle, lessonsOpened: ['/course'] });
    store.saveCycle(startCycle(2, ['c'], 2));

    expect(store.getState().cycles.map((entry) => entry.id)).toEqual(['cycle-1-1', 'cycle-2-2']);
    expect(store.getState().cycles[0]?.lessonsOpened).toEqual(['/course']);
  });

  it('keeps the latest placement result', () => {
    const { store } = newStore();
    store.setPlacement({ level: 1, exercises: 4, completedAt: 1 });
    store.setPlacement({ level: 0, exercises: 2, completedAt: 2 });
    expect(store.getState().placement).toEqual({ level: 0, exercises: 2, completedAt: 2 });
  });
});

describe('export and import', () => {
  function filled() {
    const made = newStore();
    const id = made.store.open(meta('a', 0), 'practice');
    made.store.recordCheck(id, pass);
    made.store.open(meta('b', 1), 'post', 'cycle-1-1');
    made.store.saveCycle(startCycle(1, ['a', 'b'], 1));
    made.store.setPlacement({ level: 1, exercises: 4, completedAt: 3 });
    return made;
  }

  it('moves everything to another learner', () => {
    const source = filled().store;
    const memory = memoryStorage();
    const target = createAttemptStore({ learnerId: 'other', storage: memory.storage });

    expect(target.importJson(source.exportJson())).toEqual({ ok: true, attempts: 2, dropped: 0 });
    expect(target.getState()).toEqual(source.getState());
    expect(JSON.parse(memory.data.get(exerciseStoreKey('other')) ?? '')).toEqual(source.getState());
  });

  it('replaces what was there', () => {
    const { store } = filled();
    const empty = newStore().store.exportJson();
    expect(store.importJson(empty)).toEqual({ ok: true, attempts: 0, dropped: 0 });
    expect(store.getState()).toEqual({ version: 1, attempts: [], cycles: [] });
  });

  it('keeps the valid records of a half-valid file and counts the rest', () => {
    const { store } = newStore();
    const good = attempt('a', 0, 1);
    const text = JSON.stringify({ version: 1, attempts: [good, { id: 'bad' }, 3], cycles: [] });
    expect(store.importJson(text)).toEqual({ ok: true, attempts: 1, dropped: 2 });
    expect(store.getState().attempts).toEqual([good]);
  });

  it.each([
    ['{oops', 'invalid-json'],
    ['', 'invalid-json'],
    ['[]', 'not-exercise-data'],
    ['{"attempts":[]}', 'not-exercise-data'],
    ['{"version":0,"attempts":[]}', 'not-exercise-data'],
    ['{"version":2,"attempts":[]}', 'future-version'],
  ])('refuses %j without throwing or changing anything', (text, reason) => {
    const { store } = filled();
    const before = store.getState();
    expect(store.importJson(text)).toEqual({ ok: false, reason });
    expect(store.getState()).toBe(before);
  });
});

describe('clear', () => {
  it('forgets everything, in memory and in storage', () => {
    const { store, data } = newStore();
    store.open(meta(), 'practice');
    store.clear();

    expect(store.getState()).toEqual({ version: 1, attempts: [], cycles: [] });
    expect(data.has(KEY)).toBe(false);
    const reopened = createAttemptStore({ learnerId: LEARNER, storage: newStore().storage });
    expect(reopened.getState().attempts).toEqual([]);
  });
});
