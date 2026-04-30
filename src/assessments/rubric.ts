import type {
  AssessmentConstraint,
  AssessmentHint,
  AssessmentRubric,
  AssessmentSubgoal,
  AssessmentSubgoalResult,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isEditKind(value: unknown): value is AssessmentConstraint extends {
  readonly editKind: infer Kind;
}
  ? Kind
  : never {
  return typeof value === 'string' && value.length > 0;
}

export function isAssessmentHint(value: unknown): value is AssessmentHint {
  return (
    isRecord(value) &&
    (value.tier === 1 || value.tier === 2 || value.tier === 3) &&
    hasString(value, 'content')
  );
}

export function isAssessmentSubgoal(value: unknown): value is AssessmentSubgoal {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    hasString(value, 'title') &&
    typeof value.required === 'boolean' &&
    typeof value.predicate === 'function' &&
    Array.isArray(value.hints) &&
    value.hints.length <= 3 &&
    value.hints.every(isAssessmentHint)
  );
}

export function isAssessmentConstraint(value: unknown): value is AssessmentConstraint {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false;
  }

  switch (value.kind) {
    case 'forbid-edit':
      return isEditKind(value.editKind);
    case 'max-edit-count':
      return isEditKind(value.editKind) && isPositiveInteger(value.max);
    case 'max-total-edits':
      return isPositiveInteger(value.max);
    default:
      return false;
  }
}

function isTimeCap(value: unknown): value is AssessmentRubric['timeCap'] {
  return (
    isRecord(value) &&
    (value.kind === 'step' || value.kind === 'wall') &&
    isPositiveInteger(value.value)
  );
}

export function isAssessmentRubric(value: unknown): value is AssessmentRubric {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    hasString(value, 'goal') &&
    Array.isArray(value.subgoals) &&
    value.subgoals.length > 0 &&
    value.subgoals.every(isAssessmentSubgoal) &&
    (value.passPredicate === undefined || typeof value.passPredicate === 'function') &&
    Array.isArray(value.constraints) &&
    value.constraints.every(isAssessmentConstraint) &&
    (value.timeCap === undefined || isTimeCap(value.timeCap))
  );
}

export function defaultAssessmentPassPredicate(
  rubric: AssessmentRubric,
  subgoalResults: readonly AssessmentSubgoalResult[],
): boolean {
  const resultById = new Map(subgoalResults.map((result) => [result.subgoalId, result.passed]));
  return rubric.subgoals
    .filter((subgoal) => subgoal.required)
    .every((subgoal) => resultById.get(subgoal.id) === true);
}
