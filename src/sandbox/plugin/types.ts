import type { ComponentType } from 'react';
import type { EdgeRef, InterfaceRef, NodeRef, PacketRef, SimulationSnapshot } from '../types';

export type PluginEditKind = `plugin:${string}.${string}`;

export interface PluginEdit {
  readonly kind: PluginEditKind;
  readonly [key: string]: unknown;
}

export type PluginEditorTarget = NodeRef | InterfaceRef | EdgeRef | PacketRef;

export interface PluginEditorProps<E extends PluginEdit = PluginEdit> {
  readonly target: PluginEditorTarget;
  readonly onCommit: (edit: E) => void;
  readonly onDismiss: () => void;
}

export interface PluginEditSerializer<E extends PluginEdit = PluginEdit> {
  readonly encode: (edit: E) => string;
  readonly decode: (value: string) => E | null;
}

export interface PluginEditSpec<E extends PluginEdit = PluginEdit> {
  readonly version: 1;
  readonly kind: E['kind'];
  readonly reducer: (snapshot: SimulationSnapshot, edit: E) => SimulationSnapshot;
  readonly validator: (edit: unknown) => edit is E;
  readonly serializer: PluginEditSerializer<E>;
  readonly editor?: ComponentType<PluginEditorProps<E>>;
  readonly labelFn: (edit: E) => string;
}

export interface PluginTestOptions<E extends PluginEdit = PluginEdit> {
  readonly sampleEdit: E;
  readonly sampleSnapshot: SimulationSnapshot;
}

export interface PluginTestResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}
