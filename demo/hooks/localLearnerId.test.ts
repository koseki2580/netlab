import { describe, expect, it } from 'vitest';
import { isValidLearnerId } from '../../src/progress';
import { LOCAL_LEARNER_ID_KEY, resolveLearnerId } from './localLearnerId';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe('resolveLearnerId', () => {
  it('uses an explicit learner id as given', () => {
    const storage = memoryStorage();
    expect(resolveLearnerId('class-7', storage)).toBe('class-7');
    expect(storage.getItem(LOCAL_LEARNER_ID_KEY)).toBeNull();
  });

  it('makes up a valid id on a first visit and keeps it for the next one', () => {
    const storage = memoryStorage();
    const first = resolveLearnerId(null, storage);
    expect(first).not.toBeNull();
    expect(isValidLearnerId(first!)).toBe(true);
    expect(resolveLearnerId(null, storage)).toBe(first);
  });

  it('replaces a stored id that is not a valid learner id', () => {
    const storage = memoryStorage({ [LOCAL_LEARNER_ID_KEY]: 'not valid!' });
    const id = resolveLearnerId(null, storage);
    expect(id).not.toBe('not valid!');
    expect(isValidLearnerId(id!)).toBe(true);
  });

  it('leaves progress off when there is no storage', () => {
    expect(resolveLearnerId(null, null)).toBeNull();
  });

  it('leaves progress off when storage refuses to keep anything', () => {
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(resolveLearnerId(null, blocked)).toBeNull();
  });
});
