import { describe, expect, it } from 'vitest';
import {
  clearAttempt,
  examLevelFromSearch,
  examReturnSearch,
  examRoute,
  loadAttempt,
  nextSeed,
  optionOrder,
  saveAttempt,
  seedFromSearch,
  type ExamAttempt,
} from './examAttempt';

/** A store that behaves like `sessionStorage`, kept in memory. */
function memoryStore() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const throwingStore = {
  getItem: () => {
    throw new Error('storage is blocked');
  },
  setItem: () => {
    throw new Error('storage is blocked');
  },
  removeItem: () => {
    throw new Error('storage is blocked');
  },
};

const ATTEMPT: ExamAttempt = {
  seed: 7,
  started: true,
  answers: { 'q-a': 2, 'q-b': 'not-learned' },
  marked: true,
};

describe('the order of the options in one attempt (TC-320)', () => {
  it('is always a permutation of the four options', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      for (let question = 0; question < 10; question += 1) {
        expect([...optionOrder(seed, question)].sort()).toEqual([0, 1, 2, 3]);
      }
    }
  });

  it('is the same for the same seed', () => {
    for (let question = 0; question < 10; question += 1) {
      expect(optionOrder(42, question)).toEqual(optionOrder(42, question));
    }
  });

  it('differs between seeds 1 and 2, and between questions of one attempt', () => {
    const attempt = (seed: number) =>
      Array.from({ length: 10 }, (_, question) => optionOrder(seed, question).join(''));
    expect(attempt(1)).not.toEqual(attempt(2));
    expect(new Set(attempt(1)).size).toBeGreaterThan(1);
  });

  it('does not leave the right answer in one place across many attempts', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 40; seed += 1) positions.add(optionOrder(seed, 0).indexOf(0));
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('reads a seed from the address, and ignores anything that is not a whole number', () => {
    expect(seedFromSearch('?examSeed=5')).toBe(5);
    expect(seedFromSearch('', '?a=1&examSeed=12')).toBe(12);
    expect(seedFromSearch('?examSeed=abc')).toBeUndefined();
    expect(seedFromSearch('?examSeed=')).toBeUndefined();
    expect(seedFromSearch('')).toBeUndefined();
  });

  it('uses a named seed first, then the next whole number for each "try again"', () => {
    const neverCalled = () => {
      throw new Error('a named seed needs no random number');
    };
    expect(nextSeed(5, undefined, neverCalled)).toBe(5);
    expect(nextSeed(5, 5, neverCalled)).toBe(6);
    expect(nextSeed(5, 6, neverCalled)).toBe(7);
  });

  it('without a named seed, draws one that is never the previous one', () => {
    expect(nextSeed(undefined, undefined, () => 0.5)).toBe(
      nextSeed(undefined, undefined, () => 0.5),
    );
    const first = nextSeed(undefined, undefined, () => 0.25);
    expect(Number.isInteger(first)).toBe(true);
    expect(nextSeed(undefined, first, () => 0.25)).not.toBe(first);
  });
});

describe('keeping an attempt for one level (TC-321)', () => {
  it('reads back what was saved, for that level only', () => {
    const store = memoryStore();
    saveAttempt(store, 1, ATTEMPT);
    expect(loadAttempt(store, 1)).toEqual(ATTEMPT);
    expect(loadAttempt(store, 2)).toBeNull();
  });

  it('has nothing after clearing', () => {
    const store = memoryStore();
    saveAttempt(store, 1, ATTEMPT);
    clearAttempt(store, 1);
    expect(loadAttempt(store, 1)).toBeNull();
  });

  it('works with no store and with one that throws', () => {
    expect(loadAttempt(undefined, 1)).toBeNull();
    expect(() => saveAttempt(undefined, 1, ATTEMPT)).not.toThrow();
    expect(() => clearAttempt(undefined, 1)).not.toThrow();
    expect(loadAttempt(throwingStore, 1)).toBeNull();
    expect(() => saveAttempt(throwingStore, 1, ATTEMPT)).not.toThrow();
    expect(() => clearAttempt(throwingStore, 1)).not.toThrow();
  });

  it('treats anything that is not an attempt as nothing', () => {
    const store = memoryStore();
    const key = 'netlab-exam-attempt:1';
    for (const raw of [
      'not json',
      'null',
      '[]',
      '{"seed":"7","started":true,"answers":{},"marked":false}',
      '{"seed":7,"started":true,"answers":{"q":9},"marked":false}',
      '{"seed":7,"started":true,"answers":[],"marked":"yes"}',
    ]) {
      store.setItem(key, raw);
      expect(loadAttempt(store, 1), raw).toBeNull();
    }
  });
});

describe('the way back from a lesson to the test (TC-327)', () => {
  it('names the level in the lesson address and reads it back', () => {
    expect(examLevelFromSearch(examReturnSearch(1))).toBe(1);
    expect(examLevelFromSearch(examReturnSearch(3))).toBe(3);
  });

  it('reads no level from an address that names none', () => {
    expect(examLevelFromSearch('')).toBeUndefined();
    expect(examLevelFromSearch('?fromExam=')).toBeUndefined();
    expect(examLevelFromSearch('?fromExam=0')).toBeUndefined();
    expect(examLevelFromSearch('?fromExam=two')).toBeUndefined();
  });

  it('gives the address of each level of the test', () => {
    expect(examRoute(1)).toBe('/course/exam');
    expect(examRoute(3)).toBe('/course/exam/3');
  });
});
