import { useMemo } from 'react';
import { useOptionalProgress } from '../../src/progress';

export type TrackItemState = 'done' | 'current' | 'next';

export interface TrackItemInput {
  /** Stable id used for progress lookup — typically the scenarioId or path. */
  id: string;
  /** Difficulty hint used to estimate minutes when none is provided explicitly. */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  /** Explicit estimated minutes; overrides the difficulty-derived default. */
  estMinutes?: number;
}

export interface TrackItem extends TrackItemInput {
  /** 1-based position within the recommended order. */
  step: number;
  /** Derived completion state. */
  state: TrackItemState;
  /** Resolved estimated minutes (explicit or difficulty-derived). */
  minutes: number;
}

const DIFFICULTY_MINUTES: Record<NonNullable<TrackItemInput['difficulty']>, number> = {
  beginner: 6,
  intermediate: 10,
  advanced: 15,
};

export function resolveMinutes(item: TrackItemInput): number {
  if (typeof item.estMinutes === 'number') return item.estMinutes;
  if (item.difficulty) return DIFFICULTY_MINUTES[item.difficulty];
  return 10;
}

/**
 * Derive the `done` / `current` / `next` state for an ordered list of ids: each
 * completed id is `done`, the first incomplete id is `current`, and everything
 * after it is `next`. Shared by {@link useScenarioProgress} and the learning
 * map so both compute progress state the same way.
 */
export function assignProgressStates(
  ids: readonly string[],
  isCompleted: (id: string) => boolean,
): TrackItemState[] {
  let currentAssigned = false;
  return ids.map((id) => {
    if (isCompleted(id)) return 'done';
    if (!currentAssigned) {
      currentAssigned = true;
      return 'current';
    }
    return 'next';
  });
}

/**
 * Compute per-track progress state by combining a static recommended-order
 * list with the live `ProgressProvider` completions. The first non-`done`
 * item becomes `current`; everything after it is `next`. When the provider
 * is absent (e.g. embedded contexts), all items report `current` for the
 * first and `next` thereafter.
 */
export function useScenarioProgress(items: readonly TrackItemInput[]): {
  items: TrackItem[];
  doneCount: number;
  totalCount: number;
  totalMinutes: number;
} {
  const progress = useOptionalProgress();

  return useMemo(() => {
    const isCompleted = progress.isCompleted;
    const enriched = items.map((it, idx) => {
      const minutes = resolveMinutes(it);
      return {
        ...it,
        step: idx + 1,
        minutes,
      };
    });

    const states = assignProgressStates(
      enriched.map((it) => it.id),
      isCompleted,
    );
    const result: TrackItem[] = enriched.map((it, idx) => ({
      ...it,
      state: states[idx] ?? 'next',
    }));

    return {
      items: result,
      doneCount: states.filter((s) => s === 'done').length,
      totalCount: items.length,
      totalMinutes: enriched.reduce((sum, it) => sum + it.minutes, 0),
    };
  }, [items, progress.isCompleted]);
}
