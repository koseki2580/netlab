import type { ComponentType } from 'react';
import type { PluginEdit, PluginEditorProps, PluginEditSpec } from './types';
import { assertValidPluginEditSpec, isPluginEditKind } from './validator';

const specs = new Map<string, PluginEditSpec>();

export function registerSandboxEdit<E extends PluginEdit>(spec: PluginEditSpec<E>): () => void {
  assertValidPluginEditSpec(spec);
  const kind = spec.kind;
  if (specs.has(kind)) {
    throw new Error(`[netlab] duplicate sandbox plugin edit registration: ${kind}`);
  }

  const stored = spec as unknown as PluginEditSpec;
  specs.set(kind, stored);
  return () => {
    if (specs.get(kind) === stored) {
      specs.delete(kind);
    }
  };
}

export function getSandboxEditSpec(kind: string): PluginEditSpec | null {
  return specs.get(kind) ?? null;
}

export function registeredSandboxEditKinds(): string[] {
  return Array.from(specs.keys()).sort();
}

export function isRegisteredPluginEdit(value: unknown): value is PluginEdit {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false;
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  if (!isPluginEditKind(kind)) {
    return false;
  }
  return specs.get(kind)?.validator(value) ?? false;
}

export function getSandboxEditLabel(edit: PluginEdit): string | null {
  const spec = specs.get(edit.kind);
  if (!spec || !spec.validator(edit)) {
    return null;
  }
  return spec.labelFn(edit);
}

export function getSandboxPluginEditors(): ComponentType<PluginEditorProps>[] {
  return Array.from(specs.values())
    .map((spec) => spec.editor)
    .filter((editor): editor is ComponentType<PluginEditorProps> => editor !== undefined);
}
