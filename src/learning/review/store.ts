import { safeStorage, type SafeProgressStorage } from '../../progress';
import type { ReviewState } from './scheduler';

const REVIEW_STORAGE_KEY = 'netlab-review-v1';

/** Parse a stored review state, tolerating any malformed/legacy shape. */
export function parseReviewState(raw: string | null): ReviewState {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return {};
    const out: Record<string, { box: number; dueAt: number }> = {};
    for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { box?: unknown }).box === 'number' &&
        typeof (entry as { dueAt?: unknown }).dueAt === 'number'
      ) {
        out[id] = {
          box: (entry as ReviewEntryShape).box,
          dueAt: (entry as ReviewEntryShape).dueAt,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

interface ReviewEntryShape {
  box: number;
  dueAt: number;
}

/**
 * Browser-persisted spaced-repetition state. SSR-safe and storage-failure-safe
 * via the shared `safeStorage` helper, so it degrades to in-memory when
 * `localStorage` is unavailable. Pass a custom `storage` in tests.
 */
export function createReviewStore(storage: SafeProgressStorage = safeStorage()) {
  return {
    load(): ReviewState {
      const result = storage.get(REVIEW_STORAGE_KEY);
      return result.ok ? parseReviewState(result.value) : {};
    },
    save(state: ReviewState): void {
      storage.set(REVIEW_STORAGE_KEY, JSON.stringify(state));
    },
  };
}

export { REVIEW_STORAGE_KEY };
