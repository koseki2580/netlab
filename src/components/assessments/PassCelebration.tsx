import { useI18n } from '../../i18n';

export interface PassCelebrationProps {
  readonly onSubmit: () => void;
}

export function PassCelebration({ onSubmit }: PassCelebrationProps) {
  const { t } = useI18n();
  return (
    <section
      aria-label={t('sandbox.assessment.passed.label')}
      style={{
        marginTop: 12,
        border: '1px solid #22c55e',
        borderRadius: 8,
        background: 'rgba(34, 197, 94, 0.12)',
        padding: 10,
      }}
    >
      <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>
        {t('sandbox.assessment.passed.heading')}
      </div>
      <p style={{ margin: '6px 0 0', color: 'var(--netlab-text-muted)', fontSize: 12 }}>
        {t('sandbox.assessment.passed.body')}
      </p>
      <button
        type="button"
        onClick={onSubmit}
        className="netlab-focus-ring"
        style={{ marginTop: 8 }}
      >
        {t('sandbox.assessment.submit.text')}
      </button>
    </section>
  );
}
