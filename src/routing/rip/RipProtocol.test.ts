import { describe, expect, it } from 'vitest';
import { ADMIN_DISTANCES } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { RipProtocol, ripProtocol } from './RipProtocol';

function makeTopology(overrides: Partial<NetworkTopology> = {}): NetworkTopology {
  return {
    nodes: [],
    edges: [],
    areas: [],
    routeTables: new Map(),
    ...overrides,
  };
}

function makeRouterNode(id: string): NetworkTopology['nodes'][number] {
  return {
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      role: 'router',
      layerId: 'l3',
    },
  };
}

describe('RipProtocol', () => {
  describe('Interface contract', () => {
    it('protocol name is "rip"', () => {
      expect(new RipProtocol().name).toBe('rip');
    });

    it('adminDistance is 120 (RIP admin distance per ADMIN_DISTANCES.rip)', () => {
      const protocol = new RipProtocol();
      expect(protocol.adminDistance).toBe(ADMIN_DISTANCES.rip);
      expect(protocol.adminDistance).toBe(120);
    });
  });

  describe('Stub behavior - computeRoutes', () => {
    it('returns an empty array for an empty topology', () => {
      const protocol = new RipProtocol();
      expect(protocol.computeRoutes(makeTopology())).toEqual([]);
    });

    it('returns an empty array for a topology with router nodes', () => {
      const protocol = new RipProtocol();
      const topology = makeTopology({
        nodes: [makeRouterNode('router-1'), makeRouterNode('router-2')],
      });

      expect(protocol.computeRoutes(topology)).toEqual([]);
    });

    it('return type is always an array (never null or undefined)', () => {
      const protocol = new RipProtocol();
      const routes = protocol.computeRoutes(makeTopology());

      expect(Array.isArray(routes)).toBe(true);
      expect(routes).not.toBeNull();
      expect(routes).not.toBeUndefined();
    });
  });

  describe('RoutingProtocol interface compliance', () => {
    it('computeRoutes accepts a NetworkTopology argument', () => {
      const protocol = new RipProtocol();
      const computeRoutes: (topology: NetworkTopology) => ReturnType<RipProtocol['computeRoutes']> =
        protocol.computeRoutes.bind(protocol);

      expect(computeRoutes(makeTopology({ nodes: [makeRouterNode('router-1')] }))).toEqual([]);
    });

    it('ripProtocol singleton is an instance of RipProtocol', () => {
      expect(ripProtocol).toBeInstanceOf(RipProtocol);
    });
  });
});
