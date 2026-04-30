import type { Edit } from '../edits';
import type { SandboxMode, SimulationSnapshot } from '../types';
export type { SimulationSnapshot } from '../types';

export const RECORDING_SCHEMA_VERSION = 1;
export const RECORDING_EVENT_LIMIT = 10_000;
export const RECORDING_EVENT_WARN_THRESHOLD = 8_000;
export const RECORDING_TITLE_MAX_LENGTH = 200;
export const RECORDING_AUTHOR_MAX_LENGTH = 80;

export type RecordedEventKind =
  | 'edit'
  | 'mode-changed'
  | 'tab-opened'
  | 'paused'
  | 'resumed'
  | 'forked';

export interface RecordedEditPayload {
  readonly edit: Edit;
}

export interface RecordedModeChangedPayload {
  readonly from: SandboxMode;
  readonly to: SandboxMode;
}

export interface RecordedTabOpenedPayload {
  readonly tabId: string;
}

export type RecordedNoopPayload = Record<string, never>;

export interface RecordedEvent {
  readonly seq: number;
  readonly kind: RecordedEventKind;
  readonly stepIndex: number;
  readonly wallDeltaMs: number;
  readonly payload: unknown;
  readonly resultingSnapshotId: string;
  readonly resultingSnapshot?: SimulationSnapshot;
}

export interface RecordingMetadata {
  readonly title: string;
  readonly author: string;
  readonly recordedAt: string;
  readonly durationMs: number;
  readonly toolVersion: string;
  readonly scenarioId: string;
}

export interface RecordedSession {
  readonly kind: 'recording';
  readonly schemaVersion: typeof RECORDING_SCHEMA_VERSION;
  readonly initialSnapshot: SimulationSnapshot;
  readonly events: readonly RecordedEvent[];
  readonly metadata: RecordingMetadata;
}

export function isRecordedEventKind(value: unknown): value is RecordedEventKind {
  return (
    value === 'edit' ||
    value === 'mode-changed' ||
    value === 'tab-opened' ||
    value === 'paused' ||
    value === 'resumed' ||
    value === 'forked'
  );
}
