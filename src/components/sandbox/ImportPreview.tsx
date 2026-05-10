import { useI18n } from '../../i18n';
import type { DecodedExportedSession } from '../../sandbox/session-io/schema';
import { sessionIoButtonStyle, sessionIoPanelStyle } from './sessionIoStyles';

interface ImportPreviewProps {
  readonly decoded: DecodedExportedSession;
  readonly onApply: () => void;
  readonly onCancel: () => void;
}

export function ImportPreview({ decoded, onApply, onCancel }: ImportPreviewProps) {
  const { t } = useI18n();
  const count = decoded.session.backing.length;
  const editLabel = count === 1 ? 'edit' : 'edits';

  return (
    <section aria-label={t('sandbox.edits.import.preview.label')} style={sessionIoPanelStyle}>
      <div>
        {t('sandbox.edits.import.preview.heading')} {count} {editLabel}{' '}
        {t('sandbox.edits.import.preview.fromScenario')} {decoded.exported.scenarioId}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          aria-label={t('sandbox.edits.import.preview.apply.label')}
          onClick={onApply}
          className="netlab-focus-ring"
          style={sessionIoButtonStyle}
        >
          {t('sandbox.edits.import.preview.apply.text')}
        </button>
        <button
          type="button"
          aria-label={t('sandbox.edits.import.preview.cancel.label')}
          onClick={onCancel}
          className="netlab-focus-ring"
          style={sessionIoButtonStyle}
        >
          {t('sandbox.edits.import.preview.cancel.text')}
        </button>
      </div>
    </section>
  );
}
