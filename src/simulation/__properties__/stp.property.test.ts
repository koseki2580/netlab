/**
 * @property-seed 0x5a4b12 plan/52 STP tree property.
 * @property-num-runs 50 STP convergence is heavier than pure parser/oracle properties.
 *
 * Uses 50 runs because each generated topology runs STP convergence before the
 * graph oracle. The invariant is structural and shrinks well at this count.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeStp } from '../../layers/l2-datalink';
import { PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { stpGraphIsTree } from '../../testing/properties/oracles';
import type { NetworkTopology, NetlabNode } from '../../types/topology';

function switchNode(index: number): NetlabNode {
  return {
    id: `sw${index}`,
    type: 'switch',
    position: { x: index * 100, y: 0 },
    data: {
      label: `SW${index}`,
      role: 'switch',
      layerId: 'l2',
      ports: [
        { id: 'p0', name: 'p0', macAddress: `02:00:00:00:${String(index).padStart(2, '0')}:00` },
        { id: 'p1', name: 'p1', macAddress: `02:00:00:00:${String(index).padStart(2, '0')}:01` },
      ],
    },
  };
}

function triangleTopology(extraEdge: boolean): NetworkTopology {
  const nodes = [switchNode(1), switchNode(2), switchNode(3)];
  return {
    nodes,
    edges: [
      { id: 'e1', source: 'sw1', target: 'sw2', sourceHandle: 'p0', targetHandle: 'p0' },
      { id: 'e2', source: 'sw2', target: 'sw3', sourceHandle: 'p1', targetHandle: 'p0' },
      ...(extraEdge
        ? [{ id: 'e3', source: 'sw1', target: 'sw3', sourceHandle: 'p1', targetHandle: 'p1' }]
        : []),
    ],
    areas: [],
    routeTables: new Map(),
  };
}

function activeEdges(topology: NetworkTopology): Set<string> {
  const result = computeStp(topology);
  const blockedPorts = new Set(
    [...result.ports.values()]
      .filter((port) => port.state !== 'FORWARDING')
      .map((port) => `${port.switchNodeId}:${port.portId}`),
  );
  return new Set(
    topology.edges
      .filter(
        (edge) =>
          !blockedPorts.has(`${edge.source}:${edge.sourceHandle}`) &&
          !blockedPorts.has(`${edge.target}:${edge.targetHandle}`),
      )
      .map((edge) => edge.id),
  );
}

describe('STP properties', () => {
  it('converges triangle switch topologies to a tree-shaped active graph', () => {
    fc.assert(
      fc.property(fc.boolean(), (extraEdge) => {
        const topology = triangleTopology(extraEdge);
        expect(() => stpGraphIsTree(activeEdges(topology), topology)).not.toThrow();
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: 50 },
    );
  });
});
