import type { NamedSnapshot, SnapshotEdit } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

export function isNamedSnapshot(value: unknown): value is NamedSnapshot {
  return (
    isRecord(value) &&
    hasString(value, 'id') &&
    hasString(value, 'name') &&
    hasNumber(value, 'editIndex') &&
    Number.isInteger(value.editIndex as number) &&
    (value.editIndex as number) >= 0 &&
    hasString(value, 'sessionIdAtCapture') &&
    hasNumber(value, 'createdAt')
  );
}

export function isSnapshotEdit(value: unknown): value is SnapshotEdit {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false;
  }

  switch (value.kind) {
    case 'snapshot.create':
      return (
        isNamedSnapshot(value.snapshot) &&
        (value.internal === undefined || typeof value.internal === 'boolean')
      );
    case 'snapshot.rename':
      return hasString(value, 'id') && hasString(value, 'before') && hasString(value, 'after');
    case 'snapshot.delete':
      return (
        hasString(value, 'id') &&
        isNamedSnapshot(value.before) &&
        (value.orphaned === undefined || typeof value.orphaned === 'boolean')
      );
    default:
      return false;
  }
}
