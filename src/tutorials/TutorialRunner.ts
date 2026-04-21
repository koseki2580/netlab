import type { SimulationState } from '../types/simulation';
import type { HookEventLogEntry, Tutorial, TutorialRunnerState } from './types';

const DEFAULT_EVENT_LOG_CAPACITY = 256;
const DEFAULT_MAX_STEPS = 500;

function baseState(tutorialId: string): TutorialRunnerState {
  return {
    status: 'pending',
    tutorialId,
    currentStepIndex: 0,
    stepsCompleted: 0,
  };
}

export class TutorialRunner {
  private readonly listeners = new Set<(state: TutorialRunnerState) => void>();
  private readonly eventLogCapacity: number;
  private readonly eventLog: HookEventLogEntry[] = [];
  private currentState: TutorialRunnerState;
  private latestState: SimulationState | null = null;
  private activeStepInputCount = 0;

  constructor(
    private readonly tutorial: Tutorial,
    opts: { eventLogCapacity?: number } = {},
  ) {
    this.eventLogCapacity = opts.eventLogCapacity ?? DEFAULT_EVENT_LOG_CAPACITY;
    this.currentState = baseState(tutorial.id);
  }

  get state(): Readonly<TutorialRunnerState> {
    return this.currentState;
  }

  subscribe(listener: (state: TutorialRunnerState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): void {
    if (this.currentState.status === 'active') {
      return;
    }

    const previousStatus = this.currentState.status;
    this.eventLog.length = 0;
    this.activeStepInputCount = 0;
    if (previousStatus !== 'pending') {
      this.latestState = null;
    }
    this.transition({
      status: 'active',
      tutorialId: this.tutorial.id,
      currentStepIndex: 0,
      stepsCompleted: 0,
    });
    if (previousStatus === 'pending') {
      this.evaluateCurrentStep();
    }
  }

  exit(): void {
    if (this.currentState.status === 'exited') {
      return;
    }

    this.transition({
      ...this.currentState,
      status: 'exited',
    });
  }

  onSimulationState(state: SimulationState): void {
    if (this.currentState.status === 'exited') {
      return;
    }

    this.latestState = state;
    this.evaluateCurrentStep();
  }

  onHookEvent(entry: HookEventLogEntry): void {
    if (this.currentState.status === 'exited') {
      return;
    }

    this.eventLog.push(entry);
    if (this.eventLog.length > this.eventLogCapacity) {
      this.eventLog.splice(0, this.eventLog.length - this.eventLogCapacity);
    }

    this.evaluateCurrentStep();
  }

  private evaluateCurrentStep(): void {
    if (this.currentState.status !== 'active' || this.latestState === null) {
      return;
    }

    while (this.currentState.status === 'active') {
      const step = this.tutorial.steps[this.currentState.currentStepIndex];
      if (!step) {
        this.transition({
          ...this.currentState,
          status: 'passed',
        });
        return;
      }

      const didPass = this.safeEvaluate(step.predicate);
      if (didPass) {
        const nextIndex = this.currentState.currentStepIndex + 1;
        const nextCompleted = this.currentState.stepsCompleted + 1;
        this.activeStepInputCount = 0;

        if (nextIndex >= this.tutorial.steps.length) {
          this.transition({
            status: 'passed',
            tutorialId: this.tutorial.id,
            currentStepIndex: nextIndex,
            stepsCompleted: nextCompleted,
          });
          return;
        }

        this.transition({
          status: 'active',
          tutorialId: this.tutorial.id,
          currentStepIndex: nextIndex,
          stepsCompleted: nextCompleted,
        });
        continue;
      }

      this.activeStepInputCount += 1;
      const maxSteps = step.maxSteps ?? DEFAULT_MAX_STEPS;
      if (this.activeStepInputCount >= maxSteps) {
        this.transition({
          ...this.currentState,
          status: 'failed',
          ...(step.hint ? { lastHint: step.hint } : {}),
        });
      }
      return;
    }
  }

  private safeEvaluate(predicate: Tutorial['steps'][number]['predicate']): boolean {
    try {
      return predicate({
        state: this.latestState as SimulationState,
        events: this.eventLog,
      });
    } catch {
      return false;
    }
  }

  private transition(next: TutorialRunnerState): void {
    if (
      next.status === this.currentState.status &&
      next.tutorialId === this.currentState.tutorialId &&
      next.currentStepIndex === this.currentState.currentStepIndex &&
      next.stepsCompleted === this.currentState.stepsCompleted &&
      next.lastHint === this.currentState.lastHint
    ) {
      return;
    }

    this.currentState = next;
    this.listeners.forEach((listener) => listener(this.currentState));
  }
}
