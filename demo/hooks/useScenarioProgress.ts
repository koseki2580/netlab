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

function resolveMinutes(item: TrackItemInput): number {
  if (typeof item.estMinutes === 'number') return item.estMinutes;
  if (item.difficulty) return DIFFICULTY_MINUTES[item.difficulty];
  return 10;
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

    const doneFlags = enriched.map((it) => isCompleted(it.id));
    let currentAssigned = false;
    const result: TrackItem[] = enriched.map((it, idx) => {
      if (doneFlags[idx]) {
        return { ...it, state: 'done' as const };
      }
      if (!currentAssigned) {
        currentAssigned = true;
        return { ...it, state: 'current' as const };
      }
      return { ...it, state: 'next' as const };
    });

    return {
      items: result,
      doneCount: doneFlags.filter(Boolean).length,
      totalCount: items.length,
      totalMinutes: enriched.reduce((sum, it) => sum + it.minutes, 0),
    };
  }, [items, progress.isCompleted]);
}
