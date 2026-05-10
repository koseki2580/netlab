import type { Catalog } from '../../types';

export const assessment: Catalog = {
  'sandbox.assessment.status.label': 'Assessment status',
  'sandbox.assessment.status.passed': 'Passed',
  'sandbox.assessment.status.failedTimeout': 'Timed out',
  'sandbox.assessment.status.failedConstraint': 'Constraint failed',
  'sandbox.assessment.status.exited': 'Exited',
  'sandbox.assessment.status.active': 'Active',
  'sandbox.assessment.progress.label': 'Assessment sub-goal progress',
  'sandbox.assessment.progress.text': '{{passed}} / {{total}} sub-goals',
  'sandbox.assessment.passed.label': 'Assessment passed',
  'sandbox.assessment.passed.heading': 'Assessment passed',
  'sandbox.assessment.passed.ready': 'Ready to submit.',
  'sandbox.assessment.passed.body':
    'Submit is available while the current sandbox state still satisfies the rubric.',
  'sandbox.assessment.submit.text': 'Submit',
  'sandbox.assessment.submit.prompt': 'Submission notes',
  'sandbox.assessment.submitDialog.heading': 'Submit assessment',
  'sandbox.assessment.submitDialog.notes': 'Notes',
  'sandbox.assessment.submitDialog.notesLabel': 'Submission notes',
  'sandbox.assessment.submitDialog.cancel': 'Cancel',
  'sandbox.assessment.submitDialog.downloadLabel': 'Download assessment submission',
} as const;
