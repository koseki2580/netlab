import { useSyncExternalStore } from 'react';
import { useOptionalProgress } from '../../../src/progress';
import { useT } from '../../localeContext';
import { createAttemptStore, type AttemptStore } from '../store/attemptStore';
import type { ExerciseStoreState } from '../store/types';
import { CARD } from './styles';

/**
 * One store per learner for the life of the page, shared by every exercise
 * page. When storage cannot be used the attempts live in this object alone,
 * so a second store would lose them on every navigation.
 */
const stores = new Map<string, AttemptStore>();

function storeFor(learnerId: string | null): AttemptStore {
  const key = learnerId ?? '';
  let store = stores.get(key);
  if (!store) {
    store = createAttemptStore({ learnerId });
    stores.set(key, store);
  }
  return store;
}

/**
 * The learner's attempt store and its current state. The learner id is the
 * one the app resolved for progress (`demo/main.tsx`); tests pass a store.
 */
export function useExerciseStore(injected?: AttemptStore): {
  store: AttemptStore;
  state: ExerciseStoreState;
} {
  const { learnerId } = useOptionalProgress();
  const store = injected ?? storeFor(learnerId);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  return { store, state };
}

/** Said once, plainly, when what the learner does here will not be kept. */
export function StorageNotice({ store }: { store: AttemptStore }) {
  const t = useT();
  const status = store.status();
  if (status.persistence !== 'memory') return null;
  return (
    <p
      data-testid="exercises-storage-notice"
      role="note"
      style={{ ...CARD, margin: 0, borderColor: 'var(--netlab-accent-orange)' }}
    >
      <span aria-hidden="true">ⓘ </span>
      {status.reason === 'future-version'
        ? t(
            'Your record was saved by a newer version of this app, so it is left untouched. What you do now is remembered only until you close this page.',
            '記録が新しい版のアプリで保存されているため、そのままにしてあります。いまからの記録は、このページを閉じるまでしか残りません。',
          )
        : t(
            'This browser cannot save your record. You can still do every exercise; the record is remembered only until you close this page.',
            'このブラウザには記録を保存できません。問題はすべて解けますが、記録はこのページを閉じるまでしか残りません。',
          )}
    </p>
  );
}
