import type { HookEventLogEntry, PredicateInput } from '../../tutorials/types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function eventLog(input: PredicateInput): readonly HookEventLogEntry[] {
  const candidate = isRecord(input) ? input.events : undefined;
  return Array.isArray(candidate) ? (candidate as readonly HookEventLogEntry[]) : [];
}

export function hasEvent(
  input: PredicateInput,
  name: string,
  predicate: (payload: unknown) => boolean = () => true,
): boolean {
  return eventLog(input).some(
    (event) => isRecord(event) && event.name === name && predicate(event.payload),
  );
}

export function editOf(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload) || !isRecord(payload.edit)) return null;
  return payload.edit;
}

export function editKind(payload: unknown): string | null {
  const edit = editOf(payload);
  return typeof edit?.kind === 'string' ? edit.kind : null;
}

export function findLastEditIndex(input: PredicateInput, kind: string): number {
  const events = eventLog(input);
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.name === 'sandbox:edit-applied' && editKind(event.payload) === kind) {
      return index;
    }
  }
  return -1;
}
