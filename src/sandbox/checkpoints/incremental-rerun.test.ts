import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { EditSession } from '../EditSession';
import { fromEngine, snapshotEquals } from '../SimulationSnapshot';
import type { Edit } from '../edits';
import { CheckpointLadder } from './ladder';
import { incrementalRerun } from './incremental-rerun';

function root() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

function tickEdit(after: number): Edit {
  return { kind: 'param.set', key: 'engine.tickMs', before: 100, after };
}

describe('incrementalRerun', () => {
  it('falls back to full replay when no checkpoint exists', () => {
    const base = root();
    const session = EditSession.empty().push(tickEdit(150)).push(tickEdit(200));

    const result = incrementalRerun(base, session, new CheckpointLadder(), 2);

    expect(snapshotEquals(result, session.apply(base))).toBe(true);
  });

  it('replays only edits after the nearest checkpoint', () => {
    const base = root();
    const first = tickEdit(150);
    const second = tickEdit(200);
    const third = tickEdit(250);
    const session = EditSession.empty().push(first).push(second).push(third);
    const checkpoint = EditSession.empty().push(first).push(second).apply(base);
    const ladder = new CheckpointLadder({ interval: 1 });
    ladder.onPush(2, checkpoint);

    const result = incrementalRerun(base, session, ladder, 3);

    expect(snapshotEquals(result, session.apply(base))).toBe(true);
    expect(result.parameters.engine.tickMs).toBe(250);
  });

  it('bounds target index to the visible session head', () => {
    const base = root();
    const session = EditSession.empty().push(tickEdit(150)).push(tickEdit(200)).undo();

    const result = incrementalRerun(base, session, new CheckpointLadder(), 99);

    expect(result.parameters.engine.tickMs).toBe(150);
  });
});
