import { useState } from 'react';
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
  const snapshot = sandbox.engine.snapshot;
  const annotations = snapshot.annotations;
  const existing = annotationId
    ? annotations.find((annotation) => annotation.id === annotationId)
    : undefined;
  const [content, setContent] = useState(existing?.content ?? '');
  const [color, setColor] = useState<TraceAnnotation['color']>(existing?.color ?? 'accent');

  if (existing?.author === 'scenario') {
    return (
      <div role="dialog" aria-label="Annotation editor">
        <p>Scenario annotations are locked.</p>
        <button type="button" onClick={onClose}>
          Close
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
    <div role="dialog" aria-label="Annotation editor">
      <textarea
        aria-label="Annotation content"
        value={content}
        onInput={(event) => setContent(event.currentTarget.value)}
        rows={4}
      />
      <div aria-label="Annotation color">
        <select
          aria-label="Annotation color token"
          value={color}
          onChange={(event) => setColor(event.currentTarget.value as TraceAnnotation['color'])}
        >
          <option value="accent">accent</option>
          <option value="warning">warning</option>
          <option value="info">info</option>
          <option value="neutral">neutral</option>
        </select>
      </div>
      <div aria-label="Annotation preview">{renderMarkdown(content)}</div>
      <div>
        <button type="button" aria-label="Save annotation" onClick={save}>
          Save
        </button>
        {existing ? (
          <button type="button" aria-label="Delete annotation" onClick={remove}>
            Delete
          </button>
        ) : null}
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
