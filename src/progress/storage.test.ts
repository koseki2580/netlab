import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryProgressStorage,
  createSafeProgressStorage,
  isValidLearnerId,
  progressStorageKey,
} from './storage';

describe('progress storage', () => {
  it('builds versioned learner keys and validates learner ids', () => {
    expect(progressStorageKey('class-01')).toBe('netlab-progress:v1:class-01');
    expect(isValidLearnerId('A_z-09')).toBe(true);
    expect(isValidLearnerId('bad space')).toBe(false);
    expect(isValidLearnerId('../escape')).toBe(false);
    expect(isValidLearnerId('x'.repeat(65))).toBe(false);
  });

  it('keeps storage failures inert behind the safe wrapper', () => {
    const backend = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };
    const storage = createSafeProgressStorage(backend);

    expect(storage.get('key')).toEqual({ ok: false, reason: 'unavailable' });
    expect(storage.set('key', '{}')).toEqual({ ok: false, reason: 'unavailable' });
    expect(storage.remove('key')).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('reports quota failures without throwing', () => {
    const storage = createSafeProgressStorage({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => undefined,
    });

    expect(storage.set('key', '{}')).toEqual({ ok: false, reason: 'quota-exceeded' });
  });

  it('enumerates only progress keys from memory storage', () => {
    const storage = createMemoryProgressStorage({
      'netlab-progress:v1:a': '{"learnerId":"a"}',
      unrelated: 'ignored',
    });

    expect(storage.keys()).toEqual(['netlab-progress:v1:a']);
    expect(storage.get('netlab-progress:v1:a')).toEqual({
      ok: true,
      value: '{"learnerId":"a"}',
    });
  });
});
