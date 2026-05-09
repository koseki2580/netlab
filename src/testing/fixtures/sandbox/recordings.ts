import {
  RECORDING_SCHEMA_VERSION,
  type RecordedEvent,
  type RecordedSession,
} from '../../../sandbox/recording/types';
import { buildSnapshot } from './snapshots';
import { EDITS } from './sessions';

export function buildRecording(): RecordedSession {
  const initialSnapshot = buildSnapshot('mtu');
  const events: readonly RecordedEvent[] = Object.freeze([
    Object.freeze({
      seq: 0,
      kind: 'edit' as const,
      stepIndex: 0,
      wallDeltaMs: 0,
      payload: { edit: EDITS.mtu },
      resultingSnapshotId: initialSnapshot.id,
    }),
    Object.freeze({
      seq: 1,
      kind: 'mode-changed' as const,
      stepIndex: 1,
      wallDeltaMs: 1500,
      payload: { from: 'alpha', to: 'beta' },
      resultingSnapshotId: initialSnapshot.id,
    }),
    Object.freeze({
      seq: 2,
      kind: 'edit' as const,
      stepIndex: 2,
      wallDeltaMs: 2200,
      payload: { edit: EDITS.param },
      resultingSnapshotId: initialSnapshot.id,
    }),
    Object.freeze({
      seq: 3,
      kind: 'edit' as const,
      stepIndex: 3,
      wallDeltaMs: 4000,
      payload: { edit: EDITS.traffic },
      resultingSnapshotId: initialSnapshot.id,
    }),
  ]);

  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot,
    events,
    metadata: {
      title: 'MTU fragmentation walkthrough',
      author: 'Storybook fixture',
      recordedAt: '2026-04-21T09:00:00.000Z',
      durationMs: 4000,
      toolVersion: '0.1.0',
      scenarioId: 'fragmented-echo',
    },
  };
}
