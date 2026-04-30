import type { HookEventLog } from '../tutorials/types';
import type { SimulationState } from '../types/simulation';
import type { EditSession } from '../sandbox/EditSession';
import { defaultAssessmentPassPredicate } from './rubric';
import type { AssessmentRubric, AssessmentStatus, AssessmentSubgoalResult } from './types';

interface AssessmentRunnerOptions {
  readonly now?: () => number;
}

function initialResults(rubric: AssessmentRubric): readonly AssessmentSubgoalResult[] {
  return rubric.subgoals.map((subgoal) => ({
    subgoalId: subgoal.id,
    passed: false,
  }));
}

function sameStatus(left: AssessmentStatus, right: AssessmentStatus): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class AssessmentRunner {
  private readonly listeners = new Set<(status: AssessmentStatus) => void>();
  private readonly now: () => number;
  private currentStatus: AssessmentStatus;

  constructor(
    private readonly rubric: AssessmentRubric,
    opts: AssessmentRunnerOptions = {},
  ) {
    this.now = opts.now ?? Date.now;
    this.currentStatus = {
      status: 'active',
      rubricId: rubric.id,
      subgoalResults: initialResults(rubric),
      hintsUsed: [],
      startedAt: this.now(),
      passedAt: null,
    };
  }

  get status(): AssessmentStatus {
    return this.currentStatus;
  }

  subscribe(listener: (status: AssessmentStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onSimulationState(state: SimulationState, events: HookEventLog, session: EditSession): void {
    if (
      this.currentStatus.status === 'exited' ||
      this.currentStatus.status === 'failed-constraint' ||
      this.currentStatus.status === 'failed-timeout'
    ) {
      return;
    }

    if (this.hasTimedOut(state)) {
      this.transition({ ...this.currentStatus, status: 'failed-timeout' });
      return;
    }

    const subgoalResults = this.rubric.subgoals.map((subgoal) => ({
      subgoalId: subgoal.id,
      passed: this.safeEvaluate(subgoal.predicate, state, events, session),
    }));
    const passPredicate =
      this.rubric.passPredicate ??
      ((results: readonly AssessmentSubgoalResult[]) =>
        defaultAssessmentPassPredicate(this.rubric, results));
    const didPass = this.safeEvaluatePass(passPredicate, subgoalResults);

    this.transition({
      ...this.currentStatus,
      status: didPass ? 'passed' : 'active',
      subgoalResults,
      passedAt: didPass ? (this.currentStatus.passedAt ?? this.now()) : null,
    });
  }

  useHint(subgoalId: string): void {
    if (this.currentStatus.status === 'exited') {
      return;
    }

    const subgoal = this.rubric.subgoals.find((candidate) => candidate.id === subgoalId);
    if (!subgoal) {
      return;
    }

    const usedForSubgoal = this.currentStatus.hintsUsed.filter(
      (hint) => hint.subgoalId === subgoalId,
    );
    const nextHint = subgoal.hints[usedForSubgoal.length];
    if (!nextHint) {
      return;
    }

    this.transition({
      ...this.currentStatus,
      hintsUsed: [...this.currentStatus.hintsUsed, { subgoalId, tier: nextHint.tier }],
    });
  }

  failConstraint(): void {
    if (this.currentStatus.status === 'exited') {
      return;
    }

    this.transition({ ...this.currentStatus, status: 'failed-constraint' });
  }

  exit(): void {
    if (this.currentStatus.status === 'exited') {
      return;
    }

    this.transition({ ...this.currentStatus, status: 'exited' });
  }

  private hasTimedOut(state: SimulationState): boolean {
    const timeCap = this.rubric.timeCap;
    if (!timeCap) {
      return false;
    }

    if (timeCap.kind === 'step') {
      return state.currentStep >= timeCap.value;
    }

    return this.now() - this.currentStatus.startedAt > timeCap.value;
  }

  private safeEvaluate(
    predicate: AssessmentRubric['subgoals'][number]['predicate'],
    state: SimulationState,
    events: HookEventLog,
    session: EditSession,
  ): boolean {
    try {
      return predicate({ state, events, session });
    } catch {
      return false;
    }
  }

  private safeEvaluatePass(
    predicate: (subgoalResults: readonly AssessmentSubgoalResult[]) => boolean,
    subgoalResults: readonly AssessmentSubgoalResult[],
  ): boolean {
    try {
      return predicate(subgoalResults);
    } catch {
      return false;
    }
  }

  private transition(next: AssessmentStatus): void {
    if (sameStatus(this.currentStatus, next)) {
      return;
    }

    this.currentStatus = next;
    this.listeners.forEach((listener) => listener(this.currentStatus));
  }
}
