import {
  createAssessmentSubmission,
  downloadAssessmentSubmission,
} from '../../assessments/submission';
import { useAssessment } from '../../assessments/useAssessment';
import { useSandbox } from '../../sandbox/useSandbox';
import { SubgoalListItem } from './SubgoalListItem';

function statusLabel(status: string): string {
  switch (status) {
    case 'passed':
      return 'Passed';
    case 'failed-timeout':
      return 'Timed out';
    case 'failed-constraint':
      return 'Constraint failed';
    case 'exited':
      return 'Exited';
    default:
      return 'Active';
  }
}

export function AssessmentTab() {
  const assessment = useAssessment();
  const passedCount = assessment.status.subgoalResults.filter((result) => result.passed).length;
  const totalCount = assessment.rubric.subgoals.length;

  return (
    <div>
      <section aria-label="Assessment status">
        <h3 style={{ margin: 0, fontSize: 14 }}>{assessment.rubric.goal}</h3>
        <p>{statusLabel(assessment.status.status)}</p>
        <progress
          role="progressbar"
          aria-label="Assessment sub-goal progress"
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-valuenow={passedCount}
          value={passedCount}
          max={totalCount}
        />
        <div>
          {passedCount} / {totalCount} sub-goals
        </div>
      </section>

      <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 8 }}>
        {assessment.rubric.subgoals.map((subgoal) => (
          <SubgoalListItem
            key={subgoal.id}
            subgoal={subgoal}
            result={assessment.status.subgoalResults.find(
              (result) => result.subgoalId === subgoal.id,
            )}
            hintsUsed={assessment.status.hintsUsed}
            onUseHint={assessment.useHint}
          />
        ))}
      </ol>
      {assessment.status.status === 'passed' ? (
        <section aria-label="Assessment passed" style={{ marginTop: 12 }}>
          <div>Assessment passed</div>
          <p>Ready to submit.</p>
          <AssessmentSubmitButton />
        </section>
      ) : null}
    </div>
  );
}

function AssessmentSubmitButton() {
  const assessment = useAssessment();
  const sandbox = useSandbox();

  const submit = () => {
    const learnerNotes = window.prompt('Submission notes') ?? '';
    downloadAssessmentSubmission(
      createAssessmentSubmission({
        scenarioId: assessment.scenarioId,
        rubricId: assessment.rubric.id,
        status: assessment.status,
        session: sandbox.session,
        initialParameters: sandbox.engine.parameters,
        learnerNotes,
      }),
    );
  };

  return (
    <button type="button" onClick={submit} className="netlab-focus-ring">
      Submit
    </button>
  );
}
