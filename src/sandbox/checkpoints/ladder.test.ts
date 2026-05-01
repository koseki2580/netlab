import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { fromEngine } from '../SimulationSnapshot';
import { CheckpointLadder } from './ladder';

function snapshot() {
  return fromEngine(new SimulationEngine(directTopology(), new HookEngine()));
}

describe('CheckpointLadder', () => {
  it('inserts checkpoints at the configured interval', () => {
    const ladder = new CheckpointLadder({ interval: 2, capacity: 5 });
    const first = snapshot();
    const second = snapshot();

    ladder.onPush(1, first);
    ladder.onPush(2, second);

    expect(ladder.size()).toBe(1);
    expect(ladder.nearestBefore(2)?.snapshot).toBe(second);
  });

  it('returns the nearest checkpoint before the requested edit index', () => {
    const ladder = new CheckpointLadder({ interval: 2, capacity: 5 });
    const at2 = snapshot();
    const at4 = snapshot();
    ladder.onPush(2, at2);
    ladder.onPush(4, at4);

    expect(ladder.nearestBefore(3)?.editIndex).toBe(2);
    expect(ladder.nearestBefore(4)?.editIndex).toBe(4);
  });

  it('evicts oldest checkpoints after capacity is exceeded', () => {
    const ladder = new CheckpointLadder({ interval: 1, capacity: 2 });
    ladder.onPush(1, snapshot());
    ladder.onPush(2, snapshot());
    ladder.onPush(3, snapshot());

    expect(ladder.size()).toBe(2);
    expect(ladder.nearestBefore(1)).toBeNull();
    expect(ladder.nearestBefore(3)?.editIndex).toBe(3);
  });

  it('can prune checkpoints after a rewritten head', () => {
    const ladder = new CheckpointLadder({ interval: 1, capacity: 5 });
    ladder.onPush(1, snapshot());
    ladder.onPush(2, snapshot());
    ladder.onPush(3, snapshot());

    ladder.pruneAfter(1);

    expect(ladder.size()).toBe(1);
    expect(ladder.nearestBefore(3)?.editIndex).toBe(1);
  });

  it('disables insertion when interval is zero', () => {
    const ladder = new CheckpointLadder({ interval: 0 });

    ladder.onPush(10, snapshot());

    expect(ladder.size()).toBe(0);
    expect(ladder.nearestBefore(10)).toBeNull();
  });
});
