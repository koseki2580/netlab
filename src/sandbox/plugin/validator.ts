import type { PluginEdit, PluginEditKind, PluginEditSpec } from './types';

const PLUGIN_KIND_RE = /^plugin:[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isPluginEditKind(value: unknown): value is PluginEditKind {
  return typeof value === 'string' && PLUGIN_KIND_RE.test(value);
}

export function assertValidPluginEditKind(kind: unknown): asserts kind is PluginEditKind {
  if (!isPluginEditKind(kind)) {
    throw new Error(
      '[netlab] plugin edit kind must use the namespace-prefixed shape plugin:<namespace>.<name>',
    );
  }
}

export function assertValidPluginEditSpec<E extends PluginEdit>(
  spec: PluginEditSpec<E>,
): asserts spec is PluginEditSpec<E> {
  if (!isRecord(spec)) {
    throw new Error('[netlab] plugin edit spec must be an object');
  }
  if (spec.version !== 1) {
    throw new Error('[netlab] plugin edit spec version must be 1');
  }
  assertValidPluginEditKind(spec.kind);
  if (typeof spec.reducer !== 'function') {
    throw new Error('[netlab] plugin edit spec reducer must be a function');
  }
  if (typeof spec.validator !== 'function') {
    throw new Error('[netlab] plugin edit spec validator must be a function');
  }
  if (!isRecord(spec.serializer)) {
    throw new Error('[netlab] plugin edit spec serializer must be an object');
  }
  if (typeof spec.serializer.encode !== 'function') {
    throw new Error('[netlab] plugin edit spec serializer.encode must be a function');
  }
  if (typeof spec.serializer.decode !== 'function') {
    throw new Error('[netlab] plugin edit spec serializer.decode must be a function');
  }
  if (spec.editor !== undefined && typeof spec.editor !== 'function') {
    throw new Error('[netlab] plugin edit spec editor must be a React component');
  }
  if (typeof spec.labelFn !== 'function') {
    throw new Error('[netlab] plugin edit spec labelFn must be a function');
  }
}
