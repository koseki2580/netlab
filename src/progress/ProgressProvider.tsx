import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { NetlabError } from '../errors';
import { createEmptyProgress, parseProgressJson } from './migrations';
import {
  isValidLearnerId,
  progressStorageKey,
  safeStorage,
  type SafeProgressStorage,
} from './storage';
import type {
  LearnerProgress,
  ProgressCompletion,
  ProgressCompletionInput,
  ProgressImportOptions,
  ProgressImportResult,
} from './types';

export interface ProgressContextValue {
  readonly enabled: boolean;
  readonly learnerId: string | null;
  readonly progress: LearnerProgress | null;
  readonly recordCompletion: (completion: ProgressCompletionInput) => void;
  readonly isCompleted: (id: string, kind?: ProgressCompletion['kind']) => boolean;
  readonly completionFor: (
    id: string,
    kind?: ProgressCompletion['kind'],
  ) => ProgressCompletion | null;
  readonly exportJson: () => string;
  readonly importJson: (json: string, options?: ProgressImportOptions) => ProgressImportResult;
  readonly clear: () => void;
}

export interface ProgressProviderProps {
  readonly learnerId?: string | null;
  readonly storage?: SafeProgressStorage;
  readonly children: ReactNode;
}

const INERT_CONTEXT: ProgressContextValue = {
  enabled: false,
  learnerId: null,
  progress: null,
  recordCompletion: () => undefined,
  isCompleted: () => false,
  completionFor: () => null,
  exportJson: () => '',
  importJson: () => ({ ok: false, reason: 'invalid-learner-id' }),
  clear: () => undefined,
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function completionKey(completion: Pick<ProgressCompletion, 'kind' | 'id'>): string {
  return `${completion.kind}:${completion.id}`;
}

function mergeCompletion(
  progress: LearnerProgress,
  input: ProgressCompletionInput,
  now: string,
): LearnerProgress {
  const completion: ProgressCompletion = {
    kind: input.kind,
    id: input.id,
    completedAt: input.completedAt ?? now,
    ...(input.label ? { label: input.label } : {}),
    ...(input.score ? { score: input.score } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
  const nextCompletions = progress.completions.filter(
    (item) => completionKey(item) !== completionKey(completion),
  );
  nextCompletions.push(completion);

  return {
    ...progress,
    completions: nextCompletions.sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    updatedAt: now,
  };
}

function serialize(progress: LearnerProgress): string {
  return JSON.stringify(progress, null, 2);
}

function loadProgress(learnerId: string, storage: SafeProgressStorage): LearnerProgress {
  const result = storage.get(progressStorageKey(learnerId));
  if (!result.ok || result.value === null) {
    return createEmptyProgress(learnerId);
  }
  const parsed = parseProgressJson(result.value);
  if (!parsed.ok || parsed.progress.learnerId !== learnerId) {
    return createEmptyProgress(learnerId);
  }
  return parsed.progress;
}

export function ProgressProvider({
  learnerId,
  storage: storageProp,
  children,
}: ProgressProviderProps) {
  if (learnerId && !isValidLearnerId(learnerId)) {
    throw new NetlabError({
      code: 'progress/invalid-learner-id',
      message: `[netlab] invalid learner id: ${learnerId}`,
    });
  }

  const storage = useMemo(() => storageProp ?? safeStorage(), [storageProp]);
  const enabled = Boolean(learnerId);
  const [progress, setProgress] = useState<LearnerProgress | null>(() =>
    learnerId ? loadProgress(learnerId, storage) : null,
  );

  useEffect(() => {
    if (!learnerId) {
      setProgress(null);
      return;
    }
    setProgress(loadProgress(learnerId, storage));
  }, [learnerId, storage]);

  useEffect(() => {
    if (!learnerId || typeof window === 'undefined') {
      return;
    }
    const key = progressStorageKey(learnerId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }
      setProgress(loadProgress(learnerId, storage));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [learnerId, storage]);

  const persist = useCallback(
    (next: LearnerProgress) => {
      if (!learnerId) return;
      storage.set(progressStorageKey(learnerId), serialize(next));
    },
    [learnerId, storage],
  );

  const recordCompletion = useCallback(
    (completion: ProgressCompletionInput) => {
      if (!learnerId) return;
      const now = new Date().toISOString();
      setProgress((current) => {
        const base = current ?? createEmptyProgress(learnerId, now);
        const next = mergeCompletion(base, completion, now);
        persist(next);
        return next;
      });
    },
    [learnerId, persist],
  );

  const completionFor = useCallback(
    (id: string, kind?: ProgressCompletion['kind']) => {
      return (
        progress?.completions.find(
          (completion) => completion.id === id && (kind ? completion.kind === kind : true),
        ) ?? null
      );
    },
    [progress],
  );

  const value = useMemo<ProgressContextValue>(() => {
    if (!enabled || !learnerId) {
      return INERT_CONTEXT;
    }
    return {
      enabled,
      learnerId,
      progress,
      recordCompletion,
      isCompleted: (id, kind) => completionFor(id, kind) !== null,
      completionFor,
      exportJson: () =>
        progress ? serialize(progress) : serialize(createEmptyProgress(learnerId)),
      importJson: (json, options) => {
        const parsed = parseProgressJson(json);
        if (!parsed.ok) {
          return parsed;
        }
        if (parsed.progress.learnerId !== learnerId && !options?.forceLearnerId) {
          return { ok: false, reason: 'wrong-learner-id' };
        }
        const next: LearnerProgress = {
          ...parsed.progress,
          learnerId,
          updatedAt: new Date().toISOString(),
        };
        setProgress(next);
        persist(next);
        return { ok: true };
      },
      clear: () => {
        const next = createEmptyProgress(learnerId);
        setProgress(next);
        storage.remove(progressStorageKey(learnerId));
      },
    };
  }, [completionFor, enabled, learnerId, persist, progress, recordCompletion, storage]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useOptionalProgress(): ProgressContextValue {
  return useContext(ProgressContext) ?? INERT_CONTEXT;
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new NetlabError({
      code: 'progress/missing-provider',
      message: '[netlab] useProgress must be used within <ProgressProvider>',
    });
  }
  return context;
}

export { ProgressContext };
