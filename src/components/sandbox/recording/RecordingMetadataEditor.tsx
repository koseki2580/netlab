import { useId, useMemo, useState } from 'react';
import { useI18n } from '../../../i18n';
import { renderMarkdown } from '../../../sandbox/annotations/markdown';
import {
  RECORDING_AUTHOR_MAX_LENGTH,
  RECORDING_TITLE_MAX_LENGTH,
  type RecordedSession,
} from '../../../sandbox/recording/types';
import {
  useSandboxRecorder,
  type RecordingMetadataInput,
} from '../../../sandbox/recording/SandboxRecorderProvider';

const RECORDING_NOTES_MAX_LENGTH = 1000;

function timestampForFilename(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
}

export function recordingFilename(scenarioId: string, date = new Date()): string {
  return `netlab-recording-${scenarioId}-${timestampForFilename(date)}.netlabrec.json`;
}

export function downloadRecording(session: RecordedSession): void {
  const blob = new Blob([JSON.stringify(session, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = recordingFilename(session.metadata.scenarioId);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface RecordingMetadataEditorProps {
  readonly scenarioId: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved?: (session: RecordedSession) => void;
  readonly download?: (session: RecordedSession) => void;
}

const dialogStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--netlab-color-surface, #ffffff)',
  borderRadius: 8,
  padding: 16,
  width: 'min(540px, 90vw)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
};

export function RecordingMetadataEditor({
  scenarioId,
  open,
  onClose,
  onSaved,
  download = downloadRecording,
}: RecordingMetadataEditorProps) {
  const recorder = useSandboxRecorder();
  const { t } = useI18n();
  const titleId = useId();
  const authorId = useId();
  const notesId = useId();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [notes, setNotes] = useState('');

  const titleTooLong = title.length > RECORDING_TITLE_MAX_LENGTH;
  const authorTooLong = author.length > RECORDING_AUTHOR_MAX_LENGTH;
  const notesTooLong = notes.length > RECORDING_NOTES_MAX_LENGTH;
  const canSave = !titleTooLong && !authorTooLong && !notesTooLong && title.trim().length > 0;

  const titlePreview = useMemo(() => renderMarkdown(title), [title]);

  if (!open) return null;

  const handleSave = () => {
    if (!canSave) return;
    const input: RecordingMetadataInput = {
      title: title.trim(),
      author: author.trim(),
      scenarioId,
    };
    const session = recorder.stopAndExport(input);
    download(session);
    onSaved?.(session);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="recording-metadata-editor"
      style={dialogStyle}
    >
      <div style={cardStyle}>
        <h2 id={titleId} style={{ margin: 0 }}>
          {t('sandbox.recording.metadata.heading')}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--netlab-color-muted, var(--netlab-text-muted))',
          }}
        >
          {t('sandbox.recording.metadata.captured', {
            count: recorder.eventCount,
            label:
              recorder.eventCount === 1
                ? t('sandbox.recording.metadata.event')
                : t('sandbox.recording.metadata.events'),
          })}
        </p>
        <label
          htmlFor={`${titleId}-input`}
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <span>{t('sandbox.recording.metadata.title')}</span>
          <input
            id={`${titleId}-input`}
            type="text"
            value={title}
            maxLength={RECORDING_TITLE_MAX_LENGTH + 50}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={titleTooLong}
            aria-describedby={`${titleId}-help`}
            className="netlab-focus-ring"
          />
          <small
            id={`${titleId}-help`}
            style={{ color: titleTooLong ? '#dc2626' : 'var(--netlab-text-muted)' }}
          >
            {title.length} / {RECORDING_TITLE_MAX_LENGTH}
          </small>
        </label>
        <div
          aria-label={t('sandbox.recording.metadata.titlePreview')}
          data-testid="recording-title-preview"
          style={{
            border: '1px solid var(--netlab-color-border, var(--netlab-text-primary))',
            borderRadius: 4,
            padding: '6px 8px',
            minHeight: 24,
            background: 'var(--netlab-color-bg, #f8fafc)',
          }}
        >
          {titlePreview}
        </div>
        <label htmlFor={authorId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>{t('sandbox.recording.metadata.author')}</span>
          <input
            id={authorId}
            type="text"
            value={author}
            maxLength={RECORDING_AUTHOR_MAX_LENGTH + 50}
            onChange={(event) => setAuthor(event.target.value)}
            aria-invalid={authorTooLong}
            className="netlab-focus-ring"
          />
        </label>
        <label htmlFor={notesId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>{t('sandbox.recording.metadata.notes')}</span>
          <textarea
            id={notesId}
            rows={3}
            value={notes}
            maxLength={RECORDING_NOTES_MAX_LENGTH + 100}
            onChange={(event) => setNotes(event.target.value)}
            aria-invalid={notesTooLong}
            className="netlab-focus-ring"
          />
        </label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            data-testid="recording-metadata-cancel"
            className="netlab-focus-ring"
          >
            {t('sandbox.recording.metadata.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            data-testid="recording-metadata-save"
            className="netlab-focus-ring"
          >
            {t('sandbox.recording.metadata.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
