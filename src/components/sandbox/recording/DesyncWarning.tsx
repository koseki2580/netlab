import { useI18n } from '../../../i18n';
import { useReplay } from '../../../sandbox/recording/useReplay';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  padding: '8px 12px',
  background: 'var(--netlab-color-warning-surface, #fef3c7)',
  border: '1px solid var(--netlab-color-warning, #d97706)',
  borderRadius: 4,
  color: 'var(--netlab-color-warning-foreground, #78350f)',
  fontSize: 13,
};

export interface DesyncWarningProps {
  readonly testId?: string;
}

export function DesyncWarning({ testId = 'replay-desync-warning' }: DesyncWarningProps) {
  const replay = useReplay();
  const { t } = useI18n();
  const event = replay.desyncEvent;
  if (!event) return null;

  return (
    <div role="alert" aria-live="assertive" data-testid={testId} style={containerStyle}>
      <span style={{ flex: 1 }}>{t('sandbox.recording.desync.message', { seq: event.seq })}</span>
      <button
        type="button"
        onClick={() => replay.dismissDesync()}
        aria-label={t('sandbox.recording.desync.dismiss.label')}
        data-testid={`${testId}-dismiss`}
        className="netlab-focus-ring"
      >
        {t('sandbox.recording.desync.dismiss.text')}
      </button>
    </div>
  );
}
