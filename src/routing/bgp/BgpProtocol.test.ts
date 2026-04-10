import { describe, expect, it } from 'vitest';
import { ADMIN_DISTANCES } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { BgpProtocol, bgpProtocol } from './BgpProtocol';

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

describe('BgpProtocol', () => {
  describe('Interface contract', () => {
    it('protocol name is "bgp"', () => {
      expect(new BgpProtocol().name).toBe('bgp');
    });

    it('adminDistance is 20 (eBGP distance per ADMIN_DISTANCES.ebgp)', () => {
      const protocol = new BgpProtocol();
      expect(protocol.adminDistance).toBe(ADMIN_DISTANCES.ebgp);
      expect(protocol.adminDistance).toBe(20);
    });
  });

  describe('Stub behavior - computeRoutes', () => {
    it('returns an empty array for an empty topology', () => {
      const protocol = new BgpProtocol();
      expect(protocol.computeRoutes(makeTopology())).toEqual([]);
    });

    it('returns an empty array for a topology with router nodes', () => {
      const protocol = new BgpProtocol();
      const topology = makeTopology({
        nodes: [makeRouterNode('router-1'), makeRouterNode('router-2')],
      });

      expect(protocol.computeRoutes(topology)).toEqual([]);
    });

    it('return type is always an array (never null or undefined)', () => {
      const protocol = new BgpProtocol();
      const routes = protocol.computeRoutes(makeTopology());

      expect(Array.isArray(routes)).toBe(true);
      expect(routes).not.toBeNull();
      expect(routes).not.toBeUndefined();
    });
  });

  describe('RoutingProtocol interface compliance', () => {
    it('computeRoutes accepts a NetworkTopology argument', () => {
      const protocol = new BgpProtocol();
      const computeRoutes: (topology: NetworkTopology) => ReturnType<BgpProtocol['computeRoutes']> =
        protocol.computeRoutes.bind(protocol);

      expect(computeRoutes(makeTopology({ nodes: [makeRouterNode('router-1')] }))).toEqual([]);
    });

    it('bgpProtocol singleton is an instance of BgpProtocol', () => {
      expect(bgpProtocol).toBeInstanceOf(BgpProtocol);
    });
  });
});
