import type { SimulationState } from '../types/simulation';

export interface HookEventLogEntry {
  readonly name: string;
  readonly payload: unknown;
  readonly stepIndex: number;
}

export type HookEventLog = readonly HookEventLogEntry[];

export type PredicateInput = Readonly<{
  state: SimulationState;
  events: HookEventLog;
}>;

export type StepPredicate = (input: PredicateInput) => boolean;

export interface TutorialStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly predicate: StepPredicate;
  readonly hint?: string;
  readonly maxSteps?: number;
}

export interface Tutorial {
  readonly id: string;
  readonly scenarioId: string;
  readonly title: string;
  readonly summary: string;
  readonly difficulty: 'intro' | 'core' | 'advanced';
  readonly steps: readonly TutorialStep[];
}

export type TutorialRunnerStatus = 'pending' | 'active' | 'passed' | 'failed' | 'exited';

export interface TutorialRunnerState {
  readonly status: TutorialRunnerStatus;
  readonly tutorialId: string | null;
  readonly currentStepIndex: number;
  readonly stepsCompleted: number;
  readonly lastHint?: string;
}

export function isHookEventLogEntry(value: unknown): value is HookEventLogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.stepIndex === 'number' &&
    Number.isFinite(candidate.stepIndex)
  );
}

export function isTutorialStep(value: unknown): value is TutorialStep {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.predicate === 'function'
  );
}

export function isTutorial(value: unknown): value is Tutorial {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.scenarioId === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.summary === 'string' &&
    (candidate.difficulty === 'intro' ||
      candidate.difficulty === 'core' ||
      candidate.difficulty === 'advanced') &&
    Array.isArray(candidate.steps) &&
    candidate.steps.every(isTutorialStep)
  );
}
