import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { fromEngine, snapshotEquals } from '../SimulationSnapshot';
import type { Edit } from '../edits';
import { ReplayPlayer, buildSnapshotChain } from './player';
import { RECORDING_SCHEMA_VERSION, type RecordedEvent, type RecordedSession } from './types';

function snapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

function makeRecording(events: RecordedEvent[]): RecordedSession {
  return {
    kind: 'recording',
    schemaVersion: RECORDING_SCHEMA_VERSION,
    initialSnapshot: snapshot(),
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

function editEvent(seq: number, edit: Edit, snapshotId = ''): RecordedEvent {
  return {
    seq,
    kind: 'edit',
    stepIndex: 0,
    wallDeltaMs: 0,
    payload: { edit },
    resultingSnapshotId: snapshotId,
  };
}

function noopEvent(seq: number): RecordedEvent {
  return editEvent(seq, { kind: 'noop' });
}

interface FakeScheduler {
  readonly schedule: (handler: () => void, delayMs: number) => () => void;
  tick: (count?: number) => void;
  scheduledMs: number | null;
}

function makeScheduler(): FakeScheduler {
  let pendingHandler: (() => void) | null = null;
  let scheduledMs: number | null = null;
  const scheduler: FakeScheduler = {
    schedule(handler, delayMs) {
      pendingHandler = handler;
      scheduledMs = delayMs;
      return () => {
        pendingHandler = null;
        scheduledMs = null;
      };
    },
    tick(count = 1) {
      for (let i = 0; i < count; i += 1) {
        pendingHandler?.();
      }
    },
    get scheduledMs() {
      return scheduledMs;
    },
  } as FakeScheduler;
  return scheduler;
}

describe('ReplayPlayer', () => {
  it('starts paused at seq -1 with the initial snapshot', () => {
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1)]));
    expect(player.status).toBe('paused');
    expect(player.currentSeq).toBe(-1);
    expect(player.currentSnapshot).toBe(player.recording.initialSnapshot);
  });

  it('seek(0) applies the first event', () => {
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1)]));
    player.seek(0);
    expect(player.currentSeq).toBe(0);
  });

  it('seek to last event reaches the recorded final snapshot', () => {
    const recording = makeRecording([noopEvent(0), noopEvent(1), noopEvent(2)]);
    const chain = buildSnapshotChain(recording);
    const player = new ReplayPlayer(recording);
    player.seek(2);
    expect(snapshotEquals(player.currentSnapshot, chain[chain.length - 1]!)).toBe(true);
    expect(player.status).toBe('paused');
  });

  it('seek clamps below -1 and above last index', () => {
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1)]));
    player.seek(99);
    expect(player.currentSeq).toBe(1);
    player.seek(-99);
    expect(player.currentSeq).toBe(-1);
  });

  it('stepForward advances by one event; stepBackward retreats', () => {
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1)]));
    player.stepForward();
    expect(player.currentSeq).toBe(0);
    player.stepForward();
    expect(player.currentSeq).toBe(1);
    player.stepBackward();
    expect(player.currentSeq).toBe(0);
  });

  it('play transitions to playing and advances on tick', () => {
    const scheduler = makeScheduler();
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1)]), {
      schedule: scheduler.schedule,
    });
    player.play();
    expect(player.status).toBe('playing');
    scheduler.tick(1);
    expect(player.currentSeq).toBe(0);
    scheduler.tick(1);
    expect(player.currentSeq).toBe(1);
    expect(player.status).toBe('finished');
  });

  it('pause stops the timer and transitions to paused', () => {
    const scheduler = makeScheduler();
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1), noopEvent(2)]), {
      schedule: scheduler.schedule,
    });
    player.play();
    scheduler.tick(1);
    player.pause();
    expect(player.status).toBe('paused');
    expect(player.currentSeq).toBe(0);
    // Subsequent ticks must not advance.
    scheduler.tick(1);
    expect(player.currentSeq).toBe(0);
  });

  it('setSpeed adjusts the tick interval', () => {
    const scheduler = makeScheduler();
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1)]), {
      schedule: scheduler.schedule,
      tickIntervalMs: 1000,
    });
    player.play();
    expect(scheduler.scheduledMs).toBe(1000);
    player.setSpeed(4);
    expect(scheduler.scheduledMs).toBe(250);
    player.setSpeed(8);
    expect(scheduler.scheduledMs).toBeLessThanOrEqual(125);
  });

  it('setSpeed before play does not start the timer', () => {
    const scheduler = makeScheduler();
    const player = new ReplayPlayer(makeRecording([noopEvent(0)]), {
      schedule: scheduler.schedule,
    });
    player.setSpeed(4);
    expect(scheduler.scheduledMs).toBe(null);
  });

  it('subscribe receives notifications on state changes', () => {
    const player = new ReplayPlayer(makeRecording([noopEvent(0)]));
    let calls = 0;
    const off = player.subscribe(() => {
      calls += 1;
    });
    player.seek(0);
    expect(calls).toBeGreaterThan(0);
    off();
    const before = calls;
    player.seek(-1);
    expect(calls).toBe(before);
  });

  it('fork returns the current snapshot', () => {
    const recording = makeRecording([noopEvent(0), noopEvent(1)]);
    const player = new ReplayPlayer(recording);
    player.seek(1);
    const forked = player.fork();
    expect(snapshotEquals(forked, player.currentSnapshot)).toBe(true);
  });

  it('handles non-edit events without changing the snapshot', () => {
    const events: RecordedEvent[] = [
      {
        seq: 0,
        kind: 'mode-changed',
        stepIndex: 0,
        wallDeltaMs: 0,
        payload: { from: 'alpha', to: 'beta' },
        resultingSnapshotId: '',
      },
      noopEvent(1),
    ];
    const recording = makeRecording(events);
    const player = new ReplayPlayer(recording);
    player.seek(0);
    expect(snapshotEquals(player.currentSnapshot, recording.initialSnapshot)).toBe(true);
  });

  it('reaches finished status after playing through the last event', () => {
    const scheduler = makeScheduler();
    const player = new ReplayPlayer(makeRecording([noopEvent(0)]), {
      schedule: scheduler.schedule,
    });
    player.play();
    scheduler.tick(1);
    expect(player.status).toBe('finished');
  });

  it('respects a custom desyncOracle and transitions to desynced', () => {
    const events = [
      editEvent(0, { kind: 'noop' }, 'snap-0'),
      editEvent(1, { kind: 'noop' }, 'snap-1'),
    ];
    const player = new ReplayPlayer(makeRecording(events), {
      desyncOracle: (_replayed, expectedId) => expectedId === 'snap-1',
    });
    const captured: RecordedEvent[] = [];
    player.onDesync((evt) => {
      captured.push(evt);
    });
    player.seek(1);
    expect(player.status).toBe('desynced');
    expect(captured[0]?.seq).toBe(1);
  });

  it('blocks stepForward / play after a desync', () => {
    const player = new ReplayPlayer(makeRecording([editEvent(0, { kind: 'noop' }, 'x')]), {
      desyncOracle: () => true,
    });
    player.seek(0);
    const seqAtDesync = player.currentSeq;
    player.play();
    expect(player.status).toBe('desynced');
    player.stepForward();
    expect(player.currentSeq).toBe(seqAtDesync);
  });

  it('dispose stops timers and clears listeners', () => {
    const scheduler = makeScheduler();
    const player = new ReplayPlayer(makeRecording([noopEvent(0), noopEvent(1)]), {
      schedule: scheduler.schedule,
    });
    let calls = 0;
    player.subscribe(() => {
      calls += 1;
    });
    player.play();
    player.dispose();
    scheduler.tick(2);
    expect(calls).toBeLessThanOrEqual(2);
  });

  it('buildSnapshotChain returns one snapshot per event plus the seed', () => {
    const recording = makeRecording([noopEvent(0), noopEvent(1)]);
    const chain = buildSnapshotChain(recording);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe(recording.initialSnapshot);
  });

  it('replaying the same recording twice produces equal chains (determinism oracle)', () => {
    const recording = makeRecording([noopEvent(0), noopEvent(1), noopEvent(2)]);
    const a = buildSnapshotChain(recording);
    const b = buildSnapshotChain(recording);
    expect(a).toHaveLength(b.length);
    for (let i = 0; i < a.length; i += 1) {
      expect(snapshotEquals(a[i]!, b[i]!)).toBe(true);
    }
  });
});
