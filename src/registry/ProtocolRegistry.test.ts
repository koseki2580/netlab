import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProtocolName,
  RouteEntry,
  RoutingProtocol,
  TopologyChangeEvent,
} from '../types/routing';
import type { NetworkTopology } from '../types/topology';
import { protocolRegistry } from './ProtocolRegistry';

const TOPOLOGY: NetworkTopology = {
  nodes: [],
  edges: [],
  areas: [],
  routeTables: new Map(),
};

function makeProtocol(
  overrides: Partial<RoutingProtocol> = {},
): RoutingProtocol {
  return {
    name: 'static' as ProtocolName,
    adminDistance: 1,
    computeRoutes: () => [],
    ...overrides,
  };
}

function makeRoute(overrides: Partial<RouteEntry> = {}): RouteEntry {
  return {
    nodeId: 'r1',
    destination: '10.0.0.0/24',
    nextHop: '10.0.1.1',
    protocol: 'static' as ProtocolName,
    adminDistance: 1,
    metric: 0,
    ...overrides,
  };
}

function resetRegistry() {
  for (const name of protocolRegistry.list()) {
    protocolRegistry.unregister(name);
  }
}

beforeEach(() => {
  resetRegistry();
});

afterEach(() => {
  resetRegistry();
  vi.restoreAllMocks();
});

describe('ProtocolRegistry', () => {
  describe('register / unregister / list', () => {
    it('registers a protocol and lists it', () => {
      protocolRegistry.register(makeProtocol());

      expect(protocolRegistry.list()).toEqual(['static']);
    });

    it('unregisters a protocol', () => {
      protocolRegistry.register(makeProtocol());

      protocolRegistry.unregister('static');

      expect(protocolRegistry.list()).toEqual([]);
    });

    it('unregistering unknown name is a no-op', () => {
      protocolRegistry.unregister('ospf');

      expect(protocolRegistry.list()).toEqual([]);
    });

    it('overwrites protocol with same name', () => {
      protocolRegistry.register(
        makeProtocol({
          computeRoutes: () => [makeRoute({ nextHop: '10.0.1.1' })],
        }),
      );
      protocolRegistry.register(
        makeProtocol({
          computeRoutes: () => [makeRoute({ nextHop: '10.0.1.254' })],
        }),
      );

      const result = protocolRegistry.resolveRouteTable(TOPOLOGY);

      expect(protocolRegistry.list()).toEqual(['static']);
      expect(result.get('r1')).toEqual([
        expect.objectContaining({ nextHop: '10.0.1.254' }),
      ]);
    });
  });

  describe('resolveRouteTable', () => {
    it('returns empty map when no protocols registered', () => {
      expect(protocolRegistry.resolveRouteTable(TOPOLOGY)).toEqual(new Map());
    });

    it('returns routes from a single protocol', () => {
      protocolRegistry.register(
        makeProtocol({
          computeRoutes: () => [
            makeRoute(),
            makeRoute({
              nodeId: 'r2',
              destination: '203.0.113.0/24',
              nextHop: '203.0.113.1',
            }),
          ],
        }),
      );

      const result = protocolRegistry.resolveRouteTable(TOPOLOGY);

      expect(result.get('r1')).toEqual([makeRoute()]);
      expect(result.get('r2')).toEqual([
        makeRoute({
          nodeId: 'r2',
          destination: '203.0.113.0/24',
          nextHop: '203.0.113.1',
        }),
      ]);
    });

    it('selects route with lower adminDistance when two protocols provide same (nodeId, destination)', () => {
      protocolRegistry.register(
        makeProtocol({
          name: 'rip' as ProtocolName,
          adminDistance: 120,
          computeRoutes: () => [
            makeRoute({
              protocol: 'rip' as ProtocolName,
              adminDistance: 120,
              metric: 1,
              nextHop: '10.0.0.2',
            }),
          ],
        }),
      );
      protocolRegistry.register(
        makeProtocol({
          name: 'ospf' as ProtocolName,
          adminDistance: 110,
          computeRoutes: () => [
            makeRoute({
              protocol: 'ospf' as ProtocolName,
              adminDistance: 110,
              metric: 50,
              nextHop: '10.0.0.3',
            }),
          ],
        }),
      );

      const result = protocolRegistry.resolveRouteTable(TOPOLOGY);

      expect(result.get('r1')).toEqual([
        expect.objectContaining({
          protocol: 'ospf',
          adminDistance: 110,
          nextHop: '10.0.0.3',
        }),
      ]);
    });

    it('selects route with lower metric when adminDistance is tied', () => {
      protocolRegistry.register(
        makeProtocol({
          name: 'ospf-a' as ProtocolName,
          adminDistance: 110,
          computeRoutes: () => [
            makeRoute({
              protocol: 'ospf-a' as ProtocolName,
              adminDistance: 110,
              metric: 20,
              nextHop: '10.0.0.2',
            }),
          ],
        }),
      );
      protocolRegistry.register(
        makeProtocol({
          name: 'ospf-b' as ProtocolName,
          adminDistance: 110,
          computeRoutes: () => [
            makeRoute({
              protocol: 'ospf-b' as ProtocolName,
              adminDistance: 110,
              metric: 5,
              nextHop: '10.0.0.3',
            }),
          ],
        }),
      );

      const result = protocolRegistry.resolveRouteTable(TOPOLOGY);

      expect(result.get('r1')).toEqual([
        expect.objectContaining({
          protocol: 'ospf-b',
          metric: 5,
          nextHop: '10.0.0.3',
        }),
      ]);
    });

    it('keeps higher-metric route when adminDistance is lower', () => {
      protocolRegistry.register(
        makeProtocol({
          name: 'static' as ProtocolName,
          adminDistance: 1,
          computeRoutes: () => [
            makeRoute({
              protocol: 'static' as ProtocolName,
              adminDistance: 1,
              metric: 100,
              nextHop: '10.0.0.1',
            }),
          ],
        }),
      );
      protocolRegistry.register(
        makeProtocol({
          name: 'rip' as ProtocolName,
          adminDistance: 120,
          computeRoutes: () => [
            makeRoute({
              protocol: 'rip' as ProtocolName,
              adminDistance: 120,
              metric: 1,
              nextHop: '10.0.0.2',
            }),
          ],
        }),
      );

      const result = protocolRegistry.resolveRouteTable(TOPOLOGY);

      expect(result.get('r1')).toEqual([
        expect.objectContaining({
          protocol: 'static',
          adminDistance: 1,
          metric: 100,
          nextHop: '10.0.0.1',
        }),
      ]);
    });

    it('groups routes by nodeId in result map', () => {
      protocolRegistry.register(
        makeProtocol({
          computeRoutes: () => [
            makeRoute({ nodeId: 'r1', destination: '10.0.0.0/24' }),
            makeRoute({
              nodeId: 'r2',
              destination: '203.0.113.0/24',
              nextHop: '203.0.113.1',
            }),
          ],
        }),
      );

      const result = protocolRegistry.resolveRouteTable(TOPOLOGY);

      expect(result.get('r1')).toEqual([
        expect.objectContaining({ nodeId: 'r1', destination: '10.0.0.0/24' }),
      ]);
      expect(result.get('r2')).toEqual([
        expect.objectContaining({ nodeId: 'r2', destination: '203.0.113.0/24' }),
      ]);
    });

    it('handles multiple nodes with multiple destinations', () => {
      protocolRegistry.register(
        makeProtocol({
          computeRoutes: () => [
            makeRoute({ nodeId: 'r1', destination: '10.0.0.0/24' }),
            makeRoute({
              nodeId: 'r1',
              destination: '10.0.1.0/24',
              nextHop: '10.0.1.1',
            }),
            makeRoute({
              nodeId: 'r2',
              destination: '192.0.2.0/24',
              nextHop: '192.0.2.1',
            }),
            makeRoute({
              nodeId: 'r2',
              destination: '198.51.100.0/24',
              nextHop: '198.51.100.1',
            }),
          ],
        }),
      );

      const result = protocolRegistry.resolveRouteTable(TOPOLOGY);

      expect(result.get('r1')).toHaveLength(2);
      expect(result.get('r2')).toHaveLength(2);
      expect(result.get('r1')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ destination: '10.0.0.0/24' }),
          expect.objectContaining({ destination: '10.0.1.0/24' }),
        ]),
      );
      expect(result.get('r2')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ destination: '192.0.2.0/24' }),
          expect.objectContaining({ destination: '198.51.100.0/24' }),
        ]),
      );
    });
  });

  describe('notifyTopologyChange', () => {
    it('calls onTopologyChange on all registered protocols', () => {
      const handlerA = vi.fn();
      const handlerB = vi.fn();
      const event: TopologyChangeEvent = { type: 'node:add', nodeId: 'r1' };

      protocolRegistry.register(
        makeProtocol({
          name: 'static' as ProtocolName,
          onTopologyChange: handlerA,
        }),
      );
      protocolRegistry.register(
        makeProtocol({
          name: 'ospf' as ProtocolName,
          adminDistance: 110,
          onTopologyChange: handlerB,
        }),
      );

      protocolRegistry.notifyTopologyChange(event);

      expect(handlerA).toHaveBeenCalledWith(event);
      expect(handlerB).toHaveBeenCalledWith(event);
    });

    it('does not throw when protocol has no onTopologyChange', () => {
      protocolRegistry.register(makeProtocol());

      expect(() =>
        protocolRegistry.notifyTopologyChange({ type: 'link:add', linkId: 'e1' }),
      ).not.toThrow();
    });
  });
});
