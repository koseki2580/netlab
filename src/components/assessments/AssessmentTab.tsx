import {
  createAssessmentSubmission,
  downloadAssessmentSubmission,
} from '../../assessments/submission';
import { useAssessment } from '../../assessments/useAssessment';
import { useI18n } from '../../i18n';
import { useSandbox } from '../../sandbox/useSandbox';
import { SubgoalListItem } from './SubgoalListItem';

function statusKey(status: string): string {
  switch (status) {
    case 'passed':
      return 'sandbox.assessment.status.passed';
    case 'failed-timeout':
      return 'sandbox.assessment.status.failedTimeout';
    case 'failed-constraint':
      return 'sandbox.assessment.status.failedConstraint';
    case 'exited':
      return 'sandbox.assessment.status.exited';
    default:
      return 'sandbox.assessment.status.active';
  }
}

export function AssessmentTab() {
  const assessment = useAssessment();
  const { t } = useI18n();
  const passedCount = assessment.status.subgoalResults.filter((result) => result.passed).length;
  const totalCount = assessment.rubric.subgoals.length;

  return (
    <div>
      <section aria-label={t('sandbox.assessment.status.label')}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{assessment.rubric.goal}</h3>
        <p>{t(statusKey(assessment.status.status))}</p>
        <progress
          role="progressbar"
          aria-label={t('sandbox.assessment.progress.label')}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-valuenow={passedCount}
          value={passedCount}
          max={totalCount}
        />
        <div>
          {t('sandbox.assessment.progress.text', { passed: passedCount, total: totalCount })}
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
        <section aria-label={t('sandbox.assessment.passed.label')} style={{ marginTop: 12 }}>
          <div>{t('sandbox.assessment.passed.heading')}</div>
          <p>{t('sandbox.assessment.passed.ready')}</p>
          <AssessmentSubmitButton />
        </section>
      ) : null}
    </div>
  );
}

function AssessmentSubmitButton() {
  const assessment = useAssessment();
  const sandbox = useSandbox();
  const { t } = useI18n();

  const submit = () => {
    const learnerNotes = window.prompt(t('sandbox.assessment.submit.prompt')) ?? '';
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
      {t('sandbox.assessment.submit.text')}
    </button>
  );
}
