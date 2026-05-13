import { describe, expect, it } from 'vitest';
import { StaticProtocol } from './StaticProtocol';
import type { NetworkTopology } from '../../types/topology';

describe('StaticProtocol IPv6 routes', () => {
  it('installs staticRoutes6 without changing IPv4 static routes', () => {
    const topology: NetworkTopology = {
      nodes: [
        {
          id: 'r1',
          type: 'router',
          position: { x: 0, y: 0 },
          data: {
            label: 'R1',
            layerId: 'l3',
            role: 'router',
            staticRoutes: [{ destination: '10.0.0.0/24', nextHop: 'direct' }],
            staticRoutes6: [{ destination: '2001:db8:1::/64', nextHop: 'direct' }],
          },
        },
      ],
      edges: [],
      areas: [],
      routeTables: new Map(),
    };

    const routes = new StaticProtocol().computeRoutes(topology);

    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: '10.0.0.0/24', nextHop: 'direct' }),
        expect.objectContaining({ destination: '2001:db8:1::/64', nextHop: 'direct' }),
      ]),
    );
  });
});
