import { hookEngine } from '../../hooks/HookEngine';
import type { EditKind, SandboxReducer } from './types';

type ReducerMap = Map<EditKind, SandboxReducer>;

const reducers: ReducerMap = new Map();

export const PLACEHOLDER_EDIT_KINDS = Object.freeze([] satisfies readonly EditKind[]);

export function emitRejected(
  edit: unknown,
  reason: 'unknown-kind' | 'not-paused' | 'validation-failed' | 'plugin-error' = 'unknown-kind',
): void {
  void hookEngine.emit('sandbox:edit-rejected', {
    edit,
    reason,
  });
}

export function registerReducer<K extends EditKind>(kind: K, reducer: SandboxReducer<K>): void {
  if (reducers.has(kind)) {
    throw new Error(`duplicate registration for sandbox edit reducer: ${kind}`);
  }

  reducers.set(kind, reducer as unknown as SandboxReducer);
}

export function getReducer(kind: string): SandboxReducer | null {
  return reducers.get(kind as EditKind) ?? null;
}

export function registeredKinds(): EditKind[] {
  return [...reducers.keys()];
}

export function isEditWithKind<K extends EditKind>(
  kind: K,
): (value: unknown) => value is Extract<import('./types').Edit, { readonly kind: K }> {
  return (value: unknown): value is Extract<import('./types').Edit, { readonly kind: K }> =>
    typeof value === 'object' && value !== null && 'kind' in value && value.kind === kind;
}
