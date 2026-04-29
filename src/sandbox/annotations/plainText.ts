import type { TraceAnnotation } from './types';

export function annotationPlainText(source: string): string {
  return source
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

export function annotationCommentsForEvent(
  annotations: readonly TraceAnnotation[],
  traceEventId: string | undefined,
): string | null {
  if (!traceEventId) return null;
  const comments = annotations
    .filter((annotation) => annotation.traceEventId === traceEventId)
    .map((annotation) => annotationPlainText(annotation.content));
  return comments.length > 0 ? comments.join('\n---\n') : null;
}
