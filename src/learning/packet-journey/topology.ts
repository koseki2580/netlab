import type { RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';

function route(nodeId: string, destination: string, nextHop: string): RouteEntry {
  return { destination, nextHop, metric: 0, protocol: 'static', adminDistance: 1, nodeId };
}

/**
 * The journey playground: a Y-shaped network where R1 must choose a branch.
 *
 * ```text
 *                ┌── r2 ── server-a (10.2.0.20)
 * c1 ── r1 ──────┤
 *                └── r3 ── server-b (198.51.100.20)
 * ```
 *
 * R1 has a specific route (10.2.0.0/24 via r2) and a default (via r3), so the
 * branch is a longest-prefix-match decision. R3 deliberately has NO default
 * route, so a destination beyond its connected networks is dropped — the
 * journey teaches deliver-via-LPM, deliver-via-default, and drop-no-route.
 */
export function buildJourneyTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'r1',
      [
        route('r1', '10.1.0.0/24', 'direct'),
        route('r1', '10.0.12.0/30', 'direct'),
        route('r1', '10.0.13.0/30', 'direct'),
        route('r1', '10.2.0.0/24', '10.0.12.2'),
        route('r1', '0.0.0.0/0', '10.0.13.2'),
      ],
    ],
    [
      'r2',
      [
        route('r2', '10.0.12.0/30', 'direct'),
        route('r2', '10.2.0.0/24', 'direct'),
        route('r2', '10.1.0.0/24', '10.0.12.1'),
      ],
    ],
    [
      'r3',
      [
        route('r3', '10.0.13.0/30', 'direct'),
        route('r3', '198.51.100.0/24', 'direct'),
        route('r3', '10.1.0.0/24', '10.0.13.1'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'c1',
        type: 'client',
        position: { x: 40, y: 200 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.1.0.10',
          mac: '00:00:00:aa:00:01',
        },
      },
      {
        id: 'r1',
        type: 'router',
        position: { x: 240, y: 200 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.1.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.12.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:01',
            },
            {
              id: 'eth2',
              name: 'eth2',
              ipAddress: '10.0.13.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:02',
            },
          ],
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 460, y: 90 },
        data: {
          label: 'R2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.12.2',
              prefixLength: 30,
              macAddress: '00:00:00:02:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.2.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:01',
            },
          ],
        },
      },
      {
        id: 'r3',
        type: 'router',
        position: { x: 460, y: 310 },
        data: {
          label: 'R3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.13.2',
              prefixLength: 30,
              macAddress: '00:00:00:03:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '198.51.100.1',
              prefixLength: 24,
              macAddress: '00:00:00:03:00:01',
            },
          ],
        },
      },
      {
        id: 'server-a',
        type: 'server',
        position: { x: 680, y: 90 },
        data: {
          label: 'Server A',
          role: 'server',
          layerId: 'l7',
          ip: '10.2.0.20',
          mac: '00:00:00:bb:00:01',
        },
      },
      {
        id: 'server-b',
        type: 'server',
        position: { x: 680, y: 310 },
        data: {
          label: 'Server B',
          role: 'server',
          layerId: 'l7',
          ip: '198.51.100.20',
          mac: '00:00:00:cc:00:01',
        },
      },
    ],
    edges: [
      { id: 'e-c1-r1', source: 'c1', target: 'r1', type: 'smoothstep' },
      { id: 'e-r1-r2', source: 'r1', target: 'r2', type: 'smoothstep' },
      { id: 'e-r1-r3', source: 'r1', target: 'r3', type: 'smoothstep' },
      { id: 'e-r2-server-a', source: 'r2', target: 'server-a', type: 'smoothstep' },
      { id: 'e-r3-server-b', source: 'r3', target: 'server-b', type: 'smoothstep' },
    ],
    areas: [],
    routeTables,
  };
}
