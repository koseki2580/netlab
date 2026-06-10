import { describe, expect, it } from 'vitest';
import { generateRouteProblem } from './generator';
import {
  DECIDING_ROUTER_ID,
  nextHopFromNodeId,
  nextHopNodeId,
  routeProblemTopology,
} from './topology';

describe('routeProblemTopology', () => {
  it('builds a star: the deciding router plus one neighbor per unique next-hop', () => {
    const problem = generateRouteProblem(0xfeed, 1);
    const topology = routeProblemTopology(problem);
    const nextHops = new Set(problem.routes.map((route) => route.nextHop));

    expect(topology.nodes).toHaveLength(1 + nextHops.size);
    expect(topology.nodes[0]?.id).toBe(DECIDING_ROUTER_ID);
    for (const nextHop of nextHops) {
      const node = topology.nodes.find((candidate) => candidate.id === nextHopNodeId(nextHop));
      expect(node?.data.label).toBe(nextHop);
      expect(
        topology.edges.some(
          (edge) => edge.source === DECIDING_ROUTER_ID && edge.target === nextHopNodeId(nextHop),
        ),
      ).toBe(true);
    }
    expect(topology.edges).toHaveLength(nextHops.size);
  });

  it('round-trips node ids back to next-hop addresses', () => {
    expect(nextHopFromNodeId(nextHopNodeId('192.0.2.7'))).toBe('192.0.2.7');
    expect(nextHopFromNodeId(DECIDING_ROUTER_ID)).toBeNull();
    expect(nextHopFromNodeId('something-else')).toBeNull();
  });

  it('positions neighbors at distinct coordinates', () => {
    const topology = routeProblemTopology(generateRouteProblem(7, 0));
    const positions = new Set(
      topology.nodes.map((node) => `${node.position.x},${node.position.y}`),
    );
    expect(positions.size).toBe(topology.nodes.length);
  });
});
