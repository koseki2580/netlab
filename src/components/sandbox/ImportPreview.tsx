import type { DecodedExportedSession } from '../../sandbox/session-io/schema';
import { sessionIoButtonStyle, sessionIoPanelStyle } from './sessionIoStyles';

interface ImportPreviewProps {
  readonly decoded: DecodedExportedSession;
  readonly onApply: () => void;
  readonly onCancel: () => void;
}

export function ImportPreview({ decoded, onApply, onCancel }: ImportPreviewProps) {
  const count = decoded.session.backing.length;
  const editLabel = count === 1 ? 'edit' : 'edits';

  return (
    <section aria-label="Sandbox session import preview" style={sessionIoPanelStyle}>
      <div>
        Import {count} {editLabel} from scenario {decoded.exported.scenarioId}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          aria-label="Apply imported sandbox session"
          onClick={onApply}
          className="netlab-focus-ring"
          style={sessionIoButtonStyle}
        >
          Apply
        </button>
        <button
          type="button"
          aria-label="Cancel sandbox session import"
          onClick={onCancel}
          className="netlab-focus-ring"
          style={sessionIoButtonStyle}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
