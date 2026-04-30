import { useContext } from 'react';
import { NetlabError } from '../errors';
import { AssessmentContext } from './AssessmentContext';

export function useAssessment() {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new NetlabError({
      code: 'assessment/missing-provider',
      message: '[netlab] useAssessment must be used within <AssessmentProvider>',
    });
  }

  return context;
}
