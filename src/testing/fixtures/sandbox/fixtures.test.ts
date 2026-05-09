import { describe, expect, it } from 'vitest';
import {
  EDITS,
  annotationEditsSession,
  annotationFixtures,
  buildRecording,
  buildSnapshot,
  emptySession,
  midReplaySession,
  SCENARIO_NAMES,
  singleEditSession,
  threeEditsSession,
} from './index';
import { isSimulationSnapshot } from '../../../sandbox/types';

describe('sandbox fixtures', () => {
  it('builds a structurally valid snapshot for every named scenario', () => {
    for (const name of SCENARIO_NAMES) {
      const snapshot = buildSnapshot(name);
      expect(isSimulationSnapshot(snapshot)).toBe(true);
      expect(snapshot.topology.nodes.length).toBeGreaterThan(0);
      expect(Object.isFrozen(snapshot)).toBe(true);
    }
  });

  it('attaches preseeded annotations and locks them as scenario authored', () => {
    const annotations = annotationFixtures();
    const snapshot = buildSnapshot('mtu', { preseedAnnotations: annotations });
    expect(snapshot.annotations).toHaveLength(annotations.length);
    for (const annotation of snapshot.annotations) {
      expect(annotation.author).toBe('scenario');
    }
  });

  it('returns an empty session that cannot undo', () => {
    const session = emptySession();
    expect(session.size()).toBe(0);
    expect(session.canUndo()).toBe(false);
    expect(session.canRedo()).toBe(false);
  });

  it('builds a single-edit session with an MTU edit', () => {
    const session = singleEditSession();
    expect(session.size()).toBe(1);
    expect(session.edits[0]?.kind).toBe('interface.mtu');
  });

  it('builds a three-edit session whose head equals the backing length', () => {
    const session = threeEditsSession();
    expect(session.size()).toBe(3);
    expect(session.canUndo()).toBe(true);
    expect(session.canRedo()).toBe(false);
  });

  it('builds a mid-replay session with redo available after one undo', () => {
    const session = midReplaySession();
    expect(session.size()).toBe(2);
    expect(session.canRedo()).toBe(true);
    expect(session.backing).toHaveLength(3);
  });

  it('builds an annotation-edit session with two trace.annotate.add edits', () => {
    const session = annotationEditsSession();
    expect(session.size()).toBe(2);
    for (const edit of session.edits) {
      expect(edit.kind).toBe('trace.annotate.add');
    }
  });

  it('exposes deterministic-shape edit constants', () => {
    expect(EDITS.noop.kind).toBe('noop');
    expect(EDITS.mtu.kind).toBe('interface.mtu');
    expect(EDITS.param.kind).toBe('param.set');
    expect(EDITS.traffic.kind).toBe('traffic.launch');
  });

  it('builds a recording fixture with monotonic seq + valid schema version', () => {
    const recording = buildRecording();
    expect(recording.kind).toBe('recording');
    expect(recording.events.length).toBeGreaterThan(0);
    let prev = -1;
    for (const event of recording.events) {
      expect(event.seq).toBeGreaterThan(prev);
      prev = event.seq;
    }
  });
});
