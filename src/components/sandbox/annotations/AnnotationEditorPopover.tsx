import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSandbox } from '../../../sandbox/useSandbox';
import { renderMarkdown } from '../../../sandbox/annotations/markdown';
import type { TraceAnnotation } from '../../../sandbox/annotations/types';

export interface AnnotationEditorPopoverProps {
  readonly traceEventId: string;
  readonly annotationId?: string;
  readonly onClose: () => void;
}

function makeAnnotationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `annotation-${Date.now()}`;
}

export function AnnotationEditorPopover({
  traceEventId,
  annotationId,
  onClose,
}: AnnotationEditorPopoverProps) {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const snapshot = sandbox.engine.snapshot;
  const annotations = snapshot.annotations;
  const existing = annotationId
    ? annotations.find((annotation) => annotation.id === annotationId)
    : undefined;
  const [content, setContent] = useState(existing?.content ?? '');
  const [color, setColor] = useState<TraceAnnotation['color']>(existing?.color ?? 'accent');

  if (existing?.author === 'scenario') {
    return (
      <div role="dialog" aria-label={t('sandbox.annotations.editor.label')}>
        <p>{t('sandbox.annotations.editor.locked')}</p>
        <button type="button" onClick={onClose}>
          {t('sandbox.annotations.editor.close')}
        </button>
      </div>
    );
  }

  const save = () => {
    if (content.trim().length === 0) return;
    if (existing) {
      sandbox.pushEdit({
        kind: 'trace.annotate.edit',
        id: existing.id,
        before: existing.content,
        after: content,
      });
    } else {
      sandbox.pushEdit({
        kind: 'trace.annotate.add',
        annotation: {
          id: makeAnnotationId(),
          traceEventId,
          author: 'user',
          content,
          createdAt: snapshot.capturedAt,
          ...(color ? { color } : {}),
        },
      });
    }
    onClose();
  };

  const remove = () => {
    if (!existing) return;
    sandbox.pushEdit({ kind: 'trace.annotate.remove', id: existing.id, before: existing });
    onClose();
  };

  return (
    <div role="dialog" aria-label={t('sandbox.annotations.editor.label')}>
      <textarea
        aria-label={t('sandbox.annotations.editor.content')}
        value={content}
        onInput={(event) => setContent(event.currentTarget.value)}
        rows={4}
      />
      <div aria-label={t('sandbox.annotations.editor.color')}>
        <select
          aria-label={t('sandbox.annotations.editor.colorToken')}
          value={color}
          onChange={(event) => setColor(event.currentTarget.value as TraceAnnotation['color'])}
        >
          <option value="accent">{t('sandbox.annotations.editor.color.accent')}</option>
          <option value="warning">{t('sandbox.annotations.editor.color.warning')}</option>
          <option value="info">{t('sandbox.annotations.editor.color.info')}</option>
          <option value="neutral">{t('sandbox.annotations.editor.color.neutral')}</option>
        </select>
      </div>
      <div aria-label={t('sandbox.annotations.editor.preview')}>{renderMarkdown(content)}</div>
      <div>
        <button
          type="button"
          aria-label={t('sandbox.annotations.editor.save.label')}
          onClick={save}
        >
          {t('sandbox.annotations.editor.save.text')}
        </button>
        {existing ? (
          <button
            type="button"
            aria-label={t('sandbox.annotations.editor.delete.label')}
            onClick={remove}
          >
            {t('sandbox.annotations.editor.delete.text')}
          </button>
        ) : null}
        <button type="button" onClick={onClose}>
          {t('sandbox.annotations.editor.cancel')}
        </button>
      </div>
    </div>
  );
}
