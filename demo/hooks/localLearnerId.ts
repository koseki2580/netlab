import { isValidLearnerId } from '../../src/progress';

/** Where the demo app keeps the learner id it made up for this browser. */
export const LOCAL_LEARNER_ID_KEY = 'netlab-learner-id';

interface LearnerIdStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): LearnerIdStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function freshId(): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  return `local-${random.slice(0, 16)}`;
}

/**
 * The learner id the demo app records progress under.
 *
 * An explicit `?learnerId=` always wins, so shared and classroom links keep
 * working. Without one, a first visit used to record nothing at all — the
 * gallery's progress card then counted zero forever — so the app makes up an
 * id for this browser and keeps it in storage. When storage cannot hold it
 * (blocked, private mode, quota), there is nowhere to keep progress either,
 * so this returns `null` and progress stays off, as it did before.
 *
 * This lives in the demo app on purpose: the library's `ProgressProvider`
 * still treats a missing learner id as "progress disabled".
 */
export function resolveLearnerId(
  explicit: string | null,
  storage: LearnerIdStorage | null = browserStorage(),
): string | null {
  if (explicit) return explicit;
  if (!storage) return null;
  try {
    const stored = storage.getItem(LOCAL_LEARNER_ID_KEY);
    if (stored && isValidLearnerId(stored)) return stored;
    const id = freshId();
    storage.setItem(LOCAL_LEARNER_ID_KEY, id);
    // Only claim the id once storage has demonstrably kept it.
    return storage.getItem(LOCAL_LEARNER_ID_KEY) === id ? id : null;
  } catch {
    return null;
  }
}
