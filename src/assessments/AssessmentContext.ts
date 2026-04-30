import { createContext } from 'react';
import type { AssessmentRubric, AssessmentStatus } from './types';

export interface AssessmentContextValue {
  readonly scenarioId: string;
  readonly rubric: AssessmentRubric;
  readonly status: AssessmentStatus;
  readonly useHint: (subgoalId: string) => void;
  readonly exit: () => void;
  readonly failConstraint: () => void;
}

export const AssessmentContext = createContext<AssessmentContextValue | null>(null);
