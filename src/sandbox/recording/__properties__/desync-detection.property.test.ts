import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { cloneSnapshot, fromEngine } from '../../SimulationSnapshot';
import type { Edit } from '../../edits';
import { reduceEdit } from '../../edits';
import { ReplayPlayer } from '../player';
import { RECORDING_SCHEMA_VERSION, type RecordedEvent, type RecordedSession } from '../types';
import type { SimulationSnapshot } from '../../types';

const PROPERTY_SEED = 0x5a4b70;

function freshSnapshot(): SimulationSnapshot {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

const editArb: fc.Arbitrary<Edit> = fc.constant({ kind: 'noop' } satisfies Edit);

function buildRecording(edits: readonly Edit[]): RecordedSession {
  const initial = freshSnapshot();
  let current = initial;
  const events: RecordedEvent[] = edits.map((edit, i) => {
    current = reduceEdit(current, edit);
    return {
      seq: i,
      kind: 'edit',
      stepIndex: 0,
      wallDeltaMs: 0,
      payload: { edit },
      resultingSnapshotId: 'recorded',
      resultingSnapshot: cloneSnapshot(current),
    };
  });
  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot: initial,
    events,
    metadata: {
      title: 't',
      author: 'a',
      recordedAt: '2026-04-21T00:00:00.000Z',
      durationMs: 0,
      toolVersion: '0.1.0',
      scenarioId: 'direct',
    },
  };
}

function corruptEvent(recording: RecordedSession, index: number): RecordedSession {
  const target = recording.events[index];
  if (!target?.resultingSnapshot) return recording;
  const corrupted = {
    ...target.resultingSnapshot,
    state: {
      ...target.resultingSnapshot.state,
      currentStep: target.resultingSnapshot.state.currentStep + 1_000_000,
    },
  } as SimulationSnapshot;
  const nextEvents = recording.events.map((event, i) =>
    i === index ? { ...event, resultingSnapshot: corrupted } : event,
  );
  return { ...recording, events: nextEvents };
}

describe('desync detection sensitivity', () => {
  it('a clean recording does not transition to desynced', () => {
    fc.assert(
      fc.property(fc.array(editArb, { minLength: 1, maxLength: 6 }), (edits) => {
        const recording = buildRecording(edits);
        const player = new ReplayPlayer(recording);
        player.seek(edits.length - 1);
        expect(player.status).not.toBe('desynced');
      }),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });

  it('a corrupted event triggers desynced state at or before that event', () => {
    fc.assert(
      fc.property(
        fc.array(editArb, { minLength: 2, maxLength: 6 }),
        fc.integer({ min: 0, max: 5 }),
        (edits, corruptIndexSeed) => {
          const corruptIndex = corruptIndexSeed % edits.length;
          const recording = corruptEvent(buildRecording(edits), corruptIndex);
          const player = new ReplayPlayer(recording);
          player.seek(edits.length - 1);
          expect(player.status).toBe('desynced');
          expect(player.desync?.seq).toBe(corruptIndex);
        },
      ),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });
});
