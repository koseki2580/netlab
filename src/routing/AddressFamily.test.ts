import { describe, expect, it } from 'vitest';
import { inferRouteAddressFamily, routeResolutionKey } from './AddressFamily';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import type { RoutingProtocol } from '../types/routing';

describe('AddressFamily routing helpers', () => {
  it('infers IPv6 from explicit af or IPv6 CIDR text', () => {
    expect(inferRouteAddressFamily({ destination: '10.0.0.0/24' })).toBe('v4');
    expect(inferRouteAddressFamily({ destination: '2001:db8::/64' })).toBe('v6');
    expect(inferRouteAddressFamily({ destination: '10.0.0.0/24', af: 'v6' })).toBe('v6');
  });

  it('keys routes by node, family, and destination', () => {
    expect(routeResolutionKey({ nodeId: 'r1', destination: '2001:db8::/64', af: 'v6' })).toBe(
      'r1::v6::2001:db8::/64',
    );
  });

  it('keeps IPv4 and IPv6 routes with the same textual destination separate', () => {
    const v4Protocol: RoutingProtocol = {
      name: 'test-v4',
      adminDistance: 10,
      computeRoutes: () => [
        {
          destination: 'default',
          nextHop: '192.0.2.1',
          metric: 1,
          protocol: 'test-v4',
          adminDistance: 10,
          nodeId: 'r1',
          af: 'v4',
        },
      ],
    };
    const v6Protocol: RoutingProtocol = {
      name: 'test-v6',
      adminDistance: 20,
      computeRoutes: () => [
        {
          destination: 'default',
          nextHop: '2001:db8::1',
          metric: 1,
          protocol: 'test-v6',
          adminDistance: 20,
          nodeId: 'r1',
          af: 'v6',
        },
      ],
    };

    protocolRegistry.register(v4Protocol);
    protocolRegistry.register(v6Protocol);
    const routes = protocolRegistry.resolveRouteTable({
      nodes: [],
      edges: [],
      areas: [],
      routeTables: new Map(),
    });
    protocolRegistry.unregister('test-v4');
    protocolRegistry.unregister('test-v6');

    expect(routes.get('r1')).toEqual([
      expect.objectContaining({ destination: 'default', af: 'v4' }),
      expect.objectContaining({ destination: 'default', af: 'v6' }),
    ]);
  });
});
