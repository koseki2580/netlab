import type { Edit } from '../sandbox/edits';
import type { EditSession } from '../sandbox/EditSession';
import type { AssessmentConstraint, AssessmentRubric } from './types';

export interface AssessmentConstraintViolation {
  readonly reason: 'assessment-constraint-violated';
  readonly constraint: AssessmentConstraint;
}

export function checkAssessmentConstraints(
  rubric: AssessmentRubric,
  edit: Edit,
  session: EditSession,
): AssessmentConstraintViolation | null {
  for (const constraint of rubric.constraints) {
    switch (constraint.kind) {
      case 'forbid-edit':
        if (edit.kind === constraint.editKind) {
          return { reason: 'assessment-constraint-violated', constraint };
        }
        break;
      case 'max-edit-count':
        if (
          edit.kind === constraint.editKind &&
          session.edits.filter((entry) => entry.kind === constraint.editKind).length >=
            constraint.max
        ) {
          return { reason: 'assessment-constraint-violated', constraint };
        }
        break;
      case 'max-total-edits':
        if (session.edits.length >= constraint.max) {
          return { reason: 'assessment-constraint-violated', constraint };
        }
        break;
    }
  }

  return null;
}
