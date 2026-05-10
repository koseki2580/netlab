import { useId, useState } from 'react';
import {
  createAssessmentSubmission,
  downloadAssessmentSubmission,
  type AssessmentSubmission,
} from '../../assessments/submission';
import { useAssessment } from '../../assessments/useAssessment';
import { useI18n } from '../../i18n';
import { useSandbox } from '../../sandbox/useSandbox';

export interface SubmitDialogProps {
  readonly open: boolean;
  readonly scenarioId: string;
  readonly onClose: () => void;
  readonly download?: (submission: AssessmentSubmission) => void;
}

export function SubmitDialog({
  open,
  scenarioId,
  onClose,
  download = downloadAssessmentSubmission,
}: SubmitDialogProps) {
  if (!open) return null;

  return <SubmitDialogBody scenarioId={scenarioId} onClose={onClose} download={download} />;
}

function SubmitDialogBody({
  scenarioId,
  onClose,
  download,
}: Omit<SubmitDialogProps, 'open'> & {
  readonly download: (submission: AssessmentSubmission) => void;
}) {
  const notesId = useId();
  const assessment = useAssessment();
  const sandbox = useSandbox();
  const { t } = useI18n();
  const [notes, setNotes] = useState('');
  const canSubmit = assessment.status.status === 'passed';

  const submit = () => {
    if (!canSubmit) return;
    const submission = createAssessmentSubmission({
      scenarioId,
      rubricId: assessment.rubric.id,
      status: assessment.status,
      session: sandbox.session,
      initialParameters: sandbox.engine.parameters,
      learnerNotes: notes,
    });
    download(submission);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${notesId}-title`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.45)',
      }}
    >
      <section
        style={{
          width: 'min(460px, 92vw)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 8,
          background: 'var(--netlab-bg-primary)',
          color: 'var(--netlab-text-primary)',
          padding: 16,
        }}
      >
        <h2 id={`${notesId}-title`} style={{ margin: 0, fontSize: 16 }}>
          {t('sandbox.assessment.submitDialog.heading')}
        </h2>
        <label htmlFor={notesId} style={{ display: 'grid', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 12 }}>{t('sandbox.assessment.submitDialog.notes')}</span>
          <textarea
            id={notesId}
            aria-label={t('sandbox.assessment.submitDialog.notesLabel')}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            className="netlab-focus-ring"
            style={{
              resize: 'vertical',
              border: '1px solid var(--netlab-border)',
              borderRadius: 6,
              background: 'var(--netlab-bg-surface)',
              color: 'var(--netlab-text-primary)',
              padding: 8,
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" onClick={onClose} className="netlab-focus-ring">
            {t('sandbox.assessment.submitDialog.cancel')}
          </button>
          <button
            type="button"
            aria-label={t('sandbox.assessment.submitDialog.downloadLabel')}
            disabled={!canSubmit}
            onClick={submit}
            className="netlab-focus-ring"
          >
            {t('sandbox.assessment.submit.text')}
          </button>
        </div>
      </section>
    </div>
  );
}
