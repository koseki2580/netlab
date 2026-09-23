import { describe, expect, it } from 'vitest';
import type { NetworkTopology } from '../../src/types/topology';
import { buildStpDemoTopology, markSpanningTreeLinks } from './StpLoopDemo';

function linkStates(topology: NetworkTopology): Record<string, string | undefined> {
  return Object.fromEntries(topology.edges.map((edge) => [edge.id, edge.data?.state]));
}

function withStp(
  topology: NetworkTopology,
  switchId: string,
  stpConfig: { priority?: number; disabledPortIds?: string[] },
): NetworkTopology {
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === switchId
        ? { ...node, data: { ...node.data, stpConfig: { ...node.data.stpConfig, ...stpConfig } } }
        : node,
    ),
  };
}

describe('spanning-tree lesson tells the canvas which link is blocked', () => {
  it('marks only the Switch B – Switch C link blocked with Switch A as root', () => {
    expect(linkStates(buildStpDemoTopology())).toEqual({
      'e-ah': 'up',
      'e-bh': 'up',
      'e-ch': 'up',
      'e-ab': 'up',
      'e-ac': 'up',
      'e-bc': 'blocked',
    });
  });

  it('moves the blocked mark when a new root is elected', () => {
    // Switch C becomes root; the link between the two non-roots, A and B, is
    // the one left out of forwarding.
    const reelected = markSpanningTreeLinks(
      withStp(buildStpDemoTopology(), 'switch-c', { priority: 0 }),
    );
    const states = linkStates(reelected);
    expect(states['e-bc']).toBe('up');
    expect(states['e-ac']).toBe('up');
    expect(states['e-ab']).toBe('blocked');
  });

  it('marks a link with a disabled port down, and unblocks the loop it broke', () => {
    const disabled = markSpanningTreeLinks(
      withStp(buildStpDemoTopology(), 'switch-a', { disabledPortIds: ['ab'] }),
    );
    const states = linkStates(disabled);
    expect(states['e-ab']).toBe('down');
    expect(states['e-bc']).toBe('up');
    expect(Object.values(states).filter((state) => state === 'blocked')).toEqual([]);
  });
});
