import { describe, expect, it } from 'vitest';
import { ADMIN_DISTANCES } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { OspfProtocol, ospfProtocol } from './OspfProtocol';

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

describe('OspfProtocol', () => {
  describe('Interface contract', () => {
    it('protocol name is "ospf"', () => {
      expect(new OspfProtocol().name).toBe('ospf');
    });

    it('adminDistance is 110 (OSPF standard admin distance per ADMIN_DISTANCES.ospf)', () => {
      const protocol = new OspfProtocol();
      expect(protocol.adminDistance).toBe(ADMIN_DISTANCES.ospf);
      expect(protocol.adminDistance).toBe(110);
    });
  });

  describe('Stub behavior - computeRoutes', () => {
    it('returns an empty array for an empty topology', () => {
      const protocol = new OspfProtocol();
      expect(protocol.computeRoutes(makeTopology())).toEqual([]);
    });

    it('returns an empty array for a multi-router topology', () => {
      const protocol = new OspfProtocol();
      const topology = makeTopology({
        nodes: [makeRouterNode('router-1'), makeRouterNode('router-2'), makeRouterNode('router-3')],
      });

      expect(protocol.computeRoutes(topology)).toEqual([]);
    });

    it('return type is always an array (never null or undefined)', () => {
      const protocol = new OspfProtocol();
      const routes = protocol.computeRoutes(makeTopology());

      expect(Array.isArray(routes)).toBe(true);
      expect(routes).not.toBeNull();
      expect(routes).not.toBeUndefined();
    });
  });

  describe('RoutingProtocol interface compliance', () => {
    it('computeRoutes accepts a NetworkTopology argument', () => {
      const protocol = new OspfProtocol();
      const computeRoutes: (topology: NetworkTopology) => ReturnType<OspfProtocol['computeRoutes']> =
        protocol.computeRoutes.bind(protocol);

      expect(computeRoutes(makeTopology({ nodes: [makeRouterNode('router-1')] }))).toEqual([]);
    });

    it('ospfProtocol singleton is an instance of OspfProtocol', () => {
      expect(ospfProtocol).toBeInstanceOf(OspfProtocol);
    });
  });
});
