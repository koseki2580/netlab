import { describe, expect, it } from 'vitest';
import { createMemoryProgressStorage } from '../../progress';
import { gradeReview } from './scheduler';
import { createReviewStore, parseReviewState } from './store';

describe('review store', () => {
  it('round-trips state through storage', () => {
    const storage = createMemoryProgressStorage();
    const store = createReviewStore(storage);
    expect(store.load()).toEqual({});

    const state = gradeReview({}, 'arp:q1', true, 1_700_000_000_000);
    store.save(state);
    expect(store.load()).toEqual(state);
  });

  it('tolerates malformed or legacy stored values', () => {
    expect(parseReviewState(null)).toEqual({});
    expect(parseReviewState('not json')).toEqual({});
    expect(parseReviewState('123')).toEqual({});
    expect(parseReviewState('{"arp:q1":{"box":"x"}}')).toEqual({});
    expect(parseReviewState('{"arp:q1":{"box":2,"dueAt":5},"junk":7}')).toEqual({
      'arp:q1': { box: 2, dueAt: 5 },
    });
  });

  it('degrades to empty when storage is unavailable (no throw)', () => {
    const failing = {
      get: () => ({ ok: false as const, reason: 'unavailable' as const }),
      set: () => ({ ok: false as const, reason: 'unavailable' as const }),
      remove: () => ({ ok: false as const, reason: 'unavailable' as const }),
      keys: () => [],
    };
    const store = createReviewStore(failing);
    expect(store.load()).toEqual({});
    expect(() => store.save({ 'a:q1': { box: 1, dueAt: 0 } })).not.toThrow();
  });
});
