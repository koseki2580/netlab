import { useMemo } from 'react';
import { useOptionalProgress } from '../../src/progress';
import { assignProgressStates, resolveMinutes, type TrackItemInput } from './useScenarioProgress';

/**
 * Per-step state on the learning map. Mirrors {@link useScenarioProgress}'s
 * `done` / `current`, but a track is walked sequentially: every step after the
 * `current` one is `locked` (its prereq — the previous step — is not yet done).
 */
export type LearningStepState = 'done' | 'current' | 'locked';

/** A scenario authored into a concept track (derived from the gallery category). */
export interface LearningStepInput extends TrackItemInput {
  /** Human label shown on the spine. */
  label: string;
  /** Route opened when the step is selected. */
  path: string;
}

export interface LearningTrackInput {
  id: string;
  name: string;
  steps: readonly LearningStepInput[];
}

export interface LearningStep {
  id: string;
  label: string;
  path: string;
  minutes: number;
  state: LearningStepState;
}

export interface LearningTrack {
  id: string;
  name: string;
  steps: LearningStep[];
}

/** The single point to pick up the curriculum — the first `current` step. */
export interface LearningResume {
  id: string;
  path: string;
  label: string;
}

export interface LearningMap {
  tracks: LearningTrack[];
  doneCount: number;
  totalCount: number;
  /** Estimated minutes left across every not-yet-done step. */
  remainingMinutes: number;
  /** Tracks that are not fully complete. */
  conceptsLeft: number;
  /** First incomplete step across all tracks (in track order), or `null`. */
  resume: LearningResume | null;
}

/**
 * Compose the live `ProgressProvider` completions with statically authored
 * concept tracks into a cross-curriculum learning map: done / current / locked
 * per step, remaining time, concepts left, and a single resume point. State is
 * derived — never authored — so recording a completion flips the map.
 */
export function useLearningMap(tracks: readonly LearningTrackInput[]): LearningMap {
  const progress = useOptionalProgress();

  const isCompleted = progress.isCompleted;
  return useMemo(() => {
    let doneCount = 0;
    let remainingMinutes = 0;
    let conceptsLeft = 0;
    let resume: LearningResume | null = null;

    const mapped: LearningTrack[] = tracks.map((track) => {
      const states = assignProgressStates(
        track.steps.map((s) => s.id),
        isCompleted,
      );
      const steps: LearningStep[] = track.steps.map((step, idx) => {
        // `next` (the not-yet-reachable tail of the track) renders as `locked`.
        const raw = states[idx] ?? 'next';
        const state: LearningStepState = raw === 'next' ? 'locked' : raw;
        const minutes = resolveMinutes(step);
        if (state === 'done') doneCount += 1;
        else remainingMinutes += minutes;
        if (state === 'current' && resume === null) {
          resume = { id: step.id, path: step.path, label: step.label };
        }
        return { id: step.id, label: step.label, path: step.path, minutes, state };
      });
      const allDone = steps.length > 0 && steps.every((s) => s.state === 'done');
      if (!allDone) conceptsLeft += 1;
      return { id: track.id, name: track.name, steps };
    });

    const totalCount = tracks.reduce((sum, t) => sum + t.steps.length, 0);
    return { tracks: mapped, doneCount, totalCount, remainingMinutes, conceptsLeft, resume };
  }, [tracks, isCompleted]);
}
