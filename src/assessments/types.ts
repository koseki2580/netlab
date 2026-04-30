import type { HookEventLog } from '../tutorials/types';
import type { SimulationState } from '../types/simulation';
import type { EditSession } from '../sandbox/EditSession';
import type { Edit } from '../sandbox/edits';

export interface AssessmentHint {
  readonly tier: 1 | 2 | 3;
  readonly content: string;
}

export interface AssessmentPredicateInput {
  readonly state: SimulationState;
  readonly events: HookEventLog;
  readonly session: EditSession;
}

export type AssessmentPredicate = (input: AssessmentPredicateInput) => boolean;

export interface AssessmentSubgoal {
  readonly id: string;
  readonly title: string;
  readonly required: boolean;
  readonly predicate: AssessmentPredicate;
  readonly hints: readonly AssessmentHint[];
}

export type AssessmentConstraint =
  | { readonly kind: 'forbid-edit'; readonly editKind: Edit['kind'] }
  | { readonly kind: 'max-edit-count'; readonly editKind: Edit['kind']; readonly max: number }
  | { readonly kind: 'max-total-edits'; readonly max: number };

export interface AssessmentSubgoalResult {
  readonly subgoalId: string;
  readonly passed: boolean;
}

export interface AssessmentRubric {
  readonly id: string;
  readonly goal: string;
  readonly subgoals: readonly AssessmentSubgoal[];
  readonly passPredicate?: (subgoalResults: readonly AssessmentSubgoalResult[]) => boolean;
  readonly constraints: readonly AssessmentConstraint[];
  readonly timeCap?: { readonly kind: 'step' | 'wall'; readonly value: number };
}

export interface AssessmentHintUsage {
  readonly subgoalId: string;
  readonly tier: 1 | 2 | 3;
}

export type AssessmentStatusKind =
  | 'active'
  | 'passed'
  | 'failed-timeout'
  | 'failed-constraint'
  | 'exited';

export interface AssessmentStatus {
  readonly status: AssessmentStatusKind;
  readonly rubricId: string;
  readonly subgoalResults: readonly AssessmentSubgoalResult[];
  readonly hintsUsed: readonly AssessmentHintUsage[];
  readonly startedAt: number;
  readonly passedAt: number | null;
}
