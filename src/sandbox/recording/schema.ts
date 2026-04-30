import { NetlabError } from '../../errors';
import { isEdit } from '../edits';
import { isSandboxMode, isSimulationSnapshot } from '../types';
import {
  RECORDING_AUTHOR_MAX_LENGTH,
  RECORDING_EVENT_LIMIT,
  RECORDING_SCHEMA_VERSION,
  RECORDING_TITLE_MAX_LENGTH,
  isRecordedEventKind,
  type RecordedEvent,
  type RecordedEventKind,
  type RecordedSession,
  type RecordingMetadata,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function invalid(message: string, context?: Record<string, unknown>): never {
  throw new NetlabError({
    code: 'sandbox-recording/invalid-recording',
    message,
    ...(context !== undefined ? { context } : {}),
  });
}

function unsupported(version: number): never {
  throw new NetlabError({
    code: 'sandbox-recording/unsupported-schema',
    message: `[netlab] unsupported sandbox recording schema: ${version}`,
  });
}

function validatePayload(kind: RecordedEventKind, payload: unknown): void {
  switch (kind) {
    case 'edit': {
      if (!isRecord(payload) || !isEdit(payload.edit)) {
        invalid('[netlab] recording: edit payload must contain a valid Edit');
      }
      return;
    }
    case 'mode-changed': {
      if (!isRecord(payload) || !isSandboxMode(payload.from) || !isSandboxMode(payload.to)) {
        invalid('[netlab] recording: mode-changed payload requires from/to sandbox modes');
      }
      return;
    }
    case 'tab-opened': {
      if (!isRecord(payload) || typeof payload.tabId !== 'string' || payload.tabId.length === 0) {
        invalid('[netlab] recording: tab-opened payload requires non-empty tabId');
      }
      return;
    }
    case 'paused':
    case 'resumed':
    case 'forked':
      return;
  }
}

function validateEvent(value: unknown, expectedSeq: number): RecordedEvent {
  if (!isRecord(value)) {
    invalid('[netlab] recording: event must be an object');
  }
  if (typeof value.seq !== 'number' || !Number.isInteger(value.seq) || value.seq !== expectedSeq) {
    invalid(
      `[netlab] recording: event seq must be monotonic (expected ${expectedSeq}, got ${String(value.seq)})`,
    );
  }
  if (!isRecordedEventKind(value.kind)) {
    invalid(`[netlab] recording: invalid event kind: ${String(value.kind)}`);
  }
  if (
    typeof value.stepIndex !== 'number' ||
    !Number.isInteger(value.stepIndex) ||
    value.stepIndex < -1
  ) {
    invalid('[netlab] recording: event stepIndex must be an integer ≥ -1');
  }
  if (
    typeof value.wallDeltaMs !== 'number' ||
    !Number.isFinite(value.wallDeltaMs) ||
    value.wallDeltaMs < 0
  ) {
    invalid('[netlab] recording: event wallDeltaMs must be a non-negative number');
  }
  if (typeof value.resultingSnapshotId !== 'string') {
    invalid('[netlab] recording: event resultingSnapshotId must be a string');
  }
  if (value.resultingSnapshot !== undefined && !isSimulationSnapshot(value.resultingSnapshot)) {
    invalid('[netlab] recording: event resultingSnapshot must be a valid SimulationSnapshot');
  }
  validatePayload(value.kind, value.payload);
  const event: RecordedEvent = {
    seq: value.seq,
    kind: value.kind,
    stepIndex: value.stepIndex,
    wallDeltaMs: value.wallDeltaMs,
    payload: value.payload,
    resultingSnapshotId: value.resultingSnapshotId,
    ...(value.resultingSnapshot !== undefined
      ? { resultingSnapshot: value.resultingSnapshot }
      : {}),
  };
  return event;
}

function validateMetadata(value: unknown): RecordingMetadata {
  if (!isRecord(value)) {
    invalid('[netlab] recording: metadata must be an object');
  }
  if (typeof value.title !== 'string' || value.title.length > RECORDING_TITLE_MAX_LENGTH) {
    invalid(
      `[netlab] recording: metadata.title must be a string ≤ ${RECORDING_TITLE_MAX_LENGTH} chars`,
    );
  }
  if (typeof value.author !== 'string' || value.author.length > RECORDING_AUTHOR_MAX_LENGTH) {
    invalid(
      `[netlab] recording: metadata.author must be a string ≤ ${RECORDING_AUTHOR_MAX_LENGTH} chars`,
    );
  }
  if (typeof value.recordedAt !== 'string' || Number.isNaN(Date.parse(value.recordedAt))) {
    invalid('[netlab] recording: metadata.recordedAt must be an ISO 8601 string');
  }
  if (
    typeof value.durationMs !== 'number' ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0
  ) {
    invalid('[netlab] recording: metadata.durationMs must be a non-negative number');
  }
  if (typeof value.toolVersion !== 'string' || value.toolVersion.length === 0) {
    invalid('[netlab] recording: metadata.toolVersion must be a non-empty string');
  }
  if (typeof value.scenarioId !== 'string' || value.scenarioId.length === 0) {
    invalid('[netlab] recording: metadata.scenarioId must be a non-empty string');
  }
  return {
    title: value.title,
    author: value.author,
    recordedAt: value.recordedAt,
    durationMs: value.durationMs,
    toolVersion: value.toolVersion,
    scenarioId: value.scenarioId,
  };
}

export function validateRecordedSession(input: unknown): RecordedSession {
  if (!isRecord(input)) {
    invalid('[netlab] recording: input must be an object');
  }
  if (input.kind !== 'recording') {
    invalid('[netlab] recording: missing or wrong "kind" discriminator');
  }
  if (typeof input.schemaVersion !== 'number') {
    invalid('[netlab] recording: schemaVersion is required');
  }
  if (input.schemaVersion !== RECORDING_SCHEMA_VERSION) {
    unsupported(input.schemaVersion);
  }
  if (!isSimulationSnapshot(input.initialSnapshot)) {
    invalid('[netlab] recording: initialSnapshot is not a valid SimulationSnapshot');
  }
  if (!Array.isArray(input.events)) {
    invalid('[netlab] recording: events must be an array');
  }
  if (input.events.length > RECORDING_EVENT_LIMIT) {
    invalid(
      `[netlab] recording: events must contain at most ${RECORDING_EVENT_LIMIT} entries (got ${input.events.length})`,
    );
  }
  const events: RecordedEvent[] = input.events.map((entry, index) => validateEvent(entry, index));
  const metadata = validateMetadata(input.metadata);
  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot: input.initialSnapshot,
    events,
    metadata,
  };
}

export function isRecordedSession(value: unknown): value is RecordedSession {
  try {
    validateRecordedSession(value);
    return true;
  } catch {
    return false;
  }
}
