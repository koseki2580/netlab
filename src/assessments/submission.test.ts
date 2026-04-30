import { describe, expect, it } from 'vitest';
import { EditSession } from '../sandbox/EditSession';
import { DEFAULT_PARAMETERS } from '../sandbox/types';
import { createAssessmentSubmission, assessmentSubmissionFilename } from './submission';
import type { AssessmentStatus } from './types';

const status: AssessmentStatus = {
  status: 'passed',
  rubricId: 'rubric-1',
  subgoalResults: [{ subgoalId: 'goal', passed: true }],
  hintsUsed: [{ subgoalId: 'goal', tier: 1 }],
  startedAt: 100,
  passedAt: 250,
};

describe('assessment submission', () => {
  it('wraps the exported sandbox session with assessment metadata', () => {
    const submission = createAssessmentSubmission({
      scenarioId: 'scenario-1',
      rubricId: 'rubric-1',
      status,
      session: EditSession.empty().push({ kind: 'noop' }),
      initialParameters: DEFAULT_PARAMETERS,
      learnerNotes: 'I used OSPF.',
      savedAt: new Date('2026-04-30T00:00:00.000Z'),
    });

    expect(submission.kind).toBe('assessment-submission');
    expect(submission.session.schemaVersion).toBe(2);
    expect(submission.session.backing).toEqual([{ kind: 'noop' }]);
    expect(submission.hintsUsed).toEqual([{ subgoalId: 'goal', tier: 1 }]);
  });

  it('stores elapsed time from start to first pass', () => {
    const submission = createAssessmentSubmission({
      scenarioId: 'scenario-1',
      rubricId: 'rubric-1',
      status,
      session: EditSession.empty(),
      initialParameters: DEFAULT_PARAMETERS,
      learnerNotes: '',
      savedAt: '2026-04-30T00:00:00.000Z',
    });

    expect(submission.elapsedMs).toBe(150);
  });

  it('uses zero elapsed time if the status has no passedAt timestamp', () => {
    const submission = createAssessmentSubmission({
      scenarioId: 'scenario-1',
      rubricId: 'rubric-1',
      status: { ...status, passedAt: null },
      session: EditSession.empty(),
      initialParameters: DEFAULT_PARAMETERS,
      learnerNotes: '',
    });

    expect(submission.elapsedMs).toBe(0);
  });

  it('builds a stable assessment submission filename', () => {
    expect(
      assessmentSubmissionFilename('scenario-1', 'rubric-1', new Date('2026-04-30T01:02:00')),
    ).toBe('netlab-assessment-scenario-1-rubric-1-202604300102.netlabassess.json');
  });
});
