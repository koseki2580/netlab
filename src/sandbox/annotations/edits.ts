import type { TraceAnnotation, TraceAnnotationEdit } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

export function isTraceAnnotation(value: unknown): value is TraceAnnotation {
  if (!isRecord(value)) return false;

  return (
    hasString(value, 'id') &&
    hasString(value, 'traceEventId') &&
    (value.author === 'user' || value.author === 'scenario') &&
    hasString(value, 'content') &&
    hasNumber(value, 'createdAt') &&
    (value.color === undefined || typeof value.color === 'string')
  );
}

export function isTraceAnnotationEdit(value: unknown): value is TraceAnnotationEdit {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;

  switch (value.kind) {
    case 'trace.annotate.add':
      return isTraceAnnotation(value.annotation);
    case 'trace.annotate.edit':
      return hasString(value, 'id') && hasString(value, 'before') && hasString(value, 'after');
    case 'trace.annotate.remove':
      return hasString(value, 'id') && isTraceAnnotation(value.before);
    default:
      return false;
  }
}

export function isTraceAnnotationEditWithKind<K extends TraceAnnotationEdit['kind']>(
  kind: K,
): (value: unknown) => value is Extract<TraceAnnotationEdit, { readonly kind: K }> {
  return (value: unknown): value is Extract<TraceAnnotationEdit, { readonly kind: K }> =>
    isRecord(value) && value.kind === kind && isTraceAnnotationEdit(value);
}
