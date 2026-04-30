import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { SimulationEngine } from '../../../simulation/SimulationEngine';
import { directTopology } from '../../../simulation/__fixtures__/topologies';
import { fromEngine, snapshotEquals } from '../../SimulationSnapshot';
import type { Edit } from '../../edits';
import { ReplayPlayer, buildSnapshotChain } from '../player';
import { RECORDING_SCHEMA_VERSION, type RecordedEvent, type RecordedSession } from '../types';

const PROPERTY_SEED = 0x5a4b70;

function freshSnapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

const editArb: fc.Arbitrary<Edit> = fc.oneof(
  fc.constant({ kind: 'noop' } satisfies Edit),
  fc.record({
    kind: fc.constant('packet.header' as const),
    target: fc.record({
      kind: fc.constant('packet' as const),
      traceId: fc.constant('trace-1'),
      hopIndex: fc.integer({ min: 0, max: 3 }),
    }),
    fieldPath: fc.constant('l3.ttl' as const),
    before: fc.integer({ min: 1, max: 255 }),
    after: fc.integer({ min: 1, max: 255 }),
  }),
);

function recordingFromEdits(edits: readonly Edit[]): RecordedSession {
  const events: RecordedEvent[] = edits.map((edit, i) => ({
    seq: i,
    kind: 'edit',
    stepIndex: 0,
    wallDeltaMs: 0,
    payload: { edit },
    resultingSnapshotId: '',
  }));
  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot: freshSnapshot(),
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

describe('replay determinism property', () => {
  it('replaying the same recording twice yields pairwise equal snapshot chains', () => {
    fc.assert(
      fc.property(fc.array(editArb, { minLength: 0, maxLength: 8 }), (edits) => {
        const recording = recordingFromEdits(edits);
        const a = buildSnapshotChain(recording);
        const b = buildSnapshotChain(recording);
        expect(a).toHaveLength(b.length);
        for (let i = 0; i < a.length; i += 1) {
          expect(snapshotEquals(a[i]!, b[i]!)).toBe(true);
        }
      }),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });

  it('player.seek produces a snapshot equal to the precomputed chain at the same index', () => {
    fc.assert(
      fc.property(fc.array(editArb, { minLength: 1, maxLength: 6 }), (edits) => {
        const recording = recordingFromEdits(edits);
        const chain = buildSnapshotChain(recording);
        const player = new ReplayPlayer(recording);
        for (let seq = 0; seq < edits.length; seq += 1) {
          player.seek(seq);
          expect(snapshotEquals(player.currentSnapshot, chain[seq + 1]!)).toBe(true);
        }
      }),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });

  it('forking at any seq returns a snapshot equal to the chain entry at that seq', () => {
    fc.assert(
      fc.property(
        fc.array(editArb, { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 0, max: 5 }),
        (edits, forkAt) => {
          const recording = recordingFromEdits(edits);
          const chain = buildSnapshotChain(recording);
          const seq = Math.min(forkAt, edits.length - 1);
          const player = new ReplayPlayer(recording);
          player.seek(seq);
          const forked = player.fork();
          expect(snapshotEquals(forked, chain[seq + 1]!)).toBe(true);
        },
      ),
      { seed: PROPERTY_SEED, numRuns: 100 },
    );
  });
});
