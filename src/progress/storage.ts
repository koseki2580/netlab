import type { ProgressStorageFailureReason, ProgressStorageResult } from './types';

const LEARNER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const PROGRESS_KEY_PREFIX = 'netlab-progress:v1:';

export interface ProgressStorageBackend {
  readonly length?: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key?(index: number): string | null;
}

export interface SafeProgressStorage {
  get(key: string): ProgressStorageResult<string | null>;
  set(
    key: string,
    value: string,
  ): { readonly ok: true } | { readonly ok: false; readonly reason: ProgressStorageFailureReason };
  remove(
    key: string,
  ): { readonly ok: true } | { readonly ok: false; readonly reason: ProgressStorageFailureReason };
  keys(): readonly string[];
}

export function isValidLearnerId(learnerId: string): boolean {
  return LEARNER_ID_PATTERN.test(learnerId);
}

export function progressStorageKey(learnerId: string): string {
  return `${PROGRESS_KEY_PREFIX}${learnerId}`;
}

function failureReason(error: unknown): ProgressStorageFailureReason {
  if (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return 'quota-exceeded';
  }
  return 'unavailable';
}

export function createSafeProgressStorage(
  backend: ProgressStorageBackend | null | undefined,
): SafeProgressStorage {
  return {
    get(key) {
      try {
        return { ok: true, value: backend?.getItem(key) ?? null };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
    set(key, value) {
      try {
        backend?.setItem(key, value);
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
    remove(key) {
      try {
        backend?.removeItem(key);
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
    keys() {
      if (!backend || typeof backend.key !== 'function' || typeof backend.length !== 'number') {
        return [];
      }
      const keys: string[] = [];
      try {
        for (let index = 0; index < backend.length; index += 1) {
          const key = backend.key(index);
          if (key?.startsWith(PROGRESS_KEY_PREFIX)) {
            keys.push(key);
          }
        }
      } catch {
        return [];
      }
      return keys;
    },
  };
}

export function safeStorage(): SafeProgressStorage {
  const backend =
    typeof window === 'undefined' ? undefined : (window.localStorage as ProgressStorageBackend);
  return createSafeProgressStorage(backend);
}

export function createMemoryProgressStorage(
  initial: Record<string, string> = {},
): SafeProgressStorage {
  const map = new Map(Object.entries(initial));
  const backend: ProgressStorageBackend = {
    get length() {
      return map.size;
    },
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
    key(index) {
      return [...map.keys()][index] ?? null;
    },
  };
  return createSafeProgressStorage(backend);
}
