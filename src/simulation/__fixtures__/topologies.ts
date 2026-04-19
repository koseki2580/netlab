import type { RouteEntry, RouterInterface } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { CLIENT_MAC, SERVER_MAC, SERVER_TWO_MAC, makeRouteEntry } from './helpers';

/** Simple two-node topology: client-1 -- e1 -- server-1 */
export function directTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 200, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [{ id: 'e1', source: 'client-1', target: 'server-1' }],
    areas: [],
    routeTables: new Map(),
  };
}

export function directTopologyWithoutServerMac(): NetworkTopology {
  const topology = directTopology();
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === 'server-1'
        ? (() => {
            const { mac: _omittedMac, ...data } = node.data;
            return { ...node, data };
          })()
        : node,
    ),
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- server-1 */
export function singleRouterTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

export function singleRouterTopologyWithoutServerMac(): NetworkTopology {
  const topology = singleRouterTopology();
  return {
    ...topology,
    nodes: topology.nodes.map((node) =>
      node.id === 'server-1'
        ? (() => {
            const { mac: _omittedMac, ...data } = node.data;
            return { ...node, data };
          })()
        : node,
    ),
  };
}

/** client-1 -- e1 -- switch-1 -- e2 -- server-1 */
export function switchPassthroughTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 200, y: 0 },
        data: {
          label: 'SW-1',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:01:00:00' },
            { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1' },
      { id: 'e2', source: 'switch-1', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

/** client-1 -- e1(targetHandle=p0) -- switch-1(sourceHandle=p1) -- e2 -- server-1 */
export function switchPassthroughTopologyWithHandles(): NetworkTopology {
  const topology = switchPassthroughTopology();
  return {
    ...topology,
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1', targetHandle: 'p0' },
      { id: 'e2', source: 'switch-1', target: 'server-1', sourceHandle: 'p1' },
    ],
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- switch-1 -- e3 -- server-1 */
export function routerSwitchHostTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
            },
          ],
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 400, y: 0 },
        data: {
          label: 'SW-1',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:10:00:00' },
            { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:10:00:01' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_TWO_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'switch-1' },
      { id: 'e3', source: 'switch-1', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- router-2 -- e3 -- server-1 */
export function multiHopTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '172.16.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
            },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: 0 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '172.16.0.2',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e3', source: 'router-2', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- router-2 -- e3 -- router-3 -- e4 -- server-1 */
export function threeHopChainTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-2', '192.168.0.0/24', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', '192.168.0.2'),
        makeRouteEntry('router-2', '10.0.0.0/24', '172.16.0.1'),
      ],
    ],
    [
      'router-3',
      [
        makeRouteEntry('router-3', '192.168.0.0/24', 'direct'),
        makeRouteEntry('router-3', '203.0.113.0/24', 'direct'),
        makeRouteEntry('router-3', '10.0.0.0/24', '192.168.0.1'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '172.16.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
            },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: 0 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '172.16.0.2',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '192.168.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:01',
            },
          ],
        },
      },
      {
        id: 'router-3',
        type: 'router',
        position: { x: 600, y: 0 },
        data: {
          label: 'R-3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '192.168.0.2',
              prefixLength: 24,
              macAddress: '00:00:00:03:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:03:00:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 800, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e3', source: 'router-2', target: 'router-3' },
      { id: 'e4', source: 'router-3', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** server-a -- e1 -- router-1 -- e2 -- router-2 -- e3 -- server-b */
export function dataTransferDemoTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.1.0/24', 'direct'),
        makeRouteEntry('router-1', '10.0.2.0/24', 'direct'),
        makeRouteEntry('router-1', '10.0.3.0/24', '10.0.2.2'),
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '10.0.1.0/24', '10.0.2.1'),
        makeRouteEntry('router-2', '10.0.2.0/24', 'direct'),
        makeRouteEntry('router-2', '10.0.3.0/24', 'direct'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'server-a',
        type: 'server',
        position: { x: 100, y: 300 },
        data: {
          label: 'Server A',
          role: 'server',
          layerId: 'l3',
          ip: '10.0.1.10',
          mac: 'aa:bb:cc:00:01:10',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.10',
              prefixLength: 24,
              macAddress: 'aa:bb:cc:00:01:10',
            },
          ],
          staticRoutes: [{ destination: '0.0.0.0/0', nextHop: '10.0.1.1' }],
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 300, y: 300 },
        data: {
          label: 'Router 1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: 'aa:bb:cc:00:01:01',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              macAddress: 'aa:bb:cc:00:02:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.1.0/24', nextHop: 'direct' },
            { destination: '10.0.2.0/24', nextHop: 'direct' },
            { destination: '10.0.3.0/24', nextHop: '10.0.2.2' },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 500, y: 300 },
        data: {
          label: 'Router 2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.2.2',
              prefixLength: 24,
              macAddress: 'aa:bb:cc:00:02:02',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.3.1',
              prefixLength: 24,
              macAddress: 'aa:bb:cc:00:03:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.1.0/24', nextHop: '10.0.2.1' },
            { destination: '10.0.2.0/24', nextHop: 'direct' },
            { destination: '10.0.3.0/24', nextHop: 'direct' },
          ],
        },
      },
      {
        id: 'server-b',
        type: 'server',
        position: { x: 700, y: 300 },
        data: {
          label: 'Server B',
          role: 'server',
          layerId: 'l3',
          ip: '10.0.3.10',
          mac: 'aa:bb:cc:00:03:10',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.3.10',
              prefixLength: 24,
              macAddress: 'aa:bb:cc:00:03:10',
            },
          ],
          staticRoutes: [{ destination: '0.0.0.0/0', nextHop: '10.0.3.1' }],
        },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'server-a',
        target: 'router-1',
        sourceHandle: 'eth0',
        targetHandle: 'eth0',
      },
      {
        id: 'e2',
        source: 'router-1',
        target: 'router-2',
        sourceHandle: 'eth1',
        targetHandle: 'eth0',
      },
      {
        id: 'e3',
        source: 'router-2',
        target: 'server-b',
        sourceHandle: 'eth1',
        targetHandle: 'eth0',
      },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- router-1 -- {router-2,router-3} -- router-4 -- server-1 */
export function diamondTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-1', '172.17.0.0/16', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
        makeRouteEntry('router-1', '0.0.0.0/0', '172.17.0.2'),
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-2', '10.1.0.0/24', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', '10.1.0.3'),
      ],
    ],
    [
      'router-3',
      [
        makeRouteEntry('router-3', '172.17.0.0/16', 'direct'),
        makeRouteEntry('router-3', '10.1.0.0/24', 'direct'),
        makeRouteEntry('router-3', '203.0.113.0/24', '10.1.0.3'),
      ],
    ],
    [
      'router-4',
      [
        makeRouteEntry('router-4', '10.1.0.0/24', 'direct'),
        makeRouteEntry('router-4', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '172.16.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
            },
            {
              id: 'eth2',
              name: 'eth2',
              ipAddress: '172.17.0.1',
              prefixLength: 16,
              macAddress: '00:00:00:01:00:02',
            },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: -120 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '172.16.0.2',
              prefixLength: 24,
              macAddress: '00:00:00:02:10:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.1.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:10:01',
            },
          ],
        },
      },
      {
        id: 'router-3',
        type: 'router',
        position: { x: 400, y: 120 },
        data: {
          label: 'R-3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '172.17.0.2',
              prefixLength: 16,
              macAddress: '00:00:00:03:10:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.1.0.2',
              prefixLength: 24,
              macAddress: '00:00:00:03:10:01',
            },
          ],
        },
      },
      {
        id: 'router-4',
        type: 'router',
        position: { x: 600, y: 0 },
        data: {
          label: 'R-4',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.1.0.3',
              prefixLength: 24,
              macAddress: '00:00:00:04:10:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:04:10:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 800, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e3', source: 'router-1', target: 'router-3' },
      { id: 'e4', source: 'router-2', target: 'router-4' },
      { id: 'e5', source: 'router-3', target: 'router-4' },
      { id: 'e6', source: 'router-4', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** Forward: client-1 -> router-1 -> router-2 -> server-1; return: server-1 -> router-3 -> router-1 -> client-1 */
export function asymmetricRoutingTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-1', '172.17.0.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/24', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', 'direct'),
        makeRouteEntry('router-2', '10.0.0.0/24', '172.16.0.1'),
      ],
    ],
    [
      'router-3',
      [
        makeRouteEntry('router-3', '203.0.113.0/24', 'direct'),
        makeRouteEntry('router-3', '172.17.0.0/24', 'direct'),
        makeRouteEntry('router-3', '10.0.0.0/24', '172.17.0.1'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:20:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '172.16.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:20:01',
            },
            {
              id: 'eth2',
              name: 'eth2',
              ipAddress: '172.17.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:20:02',
            },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: -80 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '172.16.0.2',
              prefixLength: 24,
              macAddress: '00:00:00:02:20:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:20:01',
            },
          ],
        },
      },
      {
        id: 'router-3',
        type: 'router',
        position: { x: 400, y: 80 },
        data: {
          label: 'R-3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '203.0.113.2',
              prefixLength: 24,
              macAddress: '00:00:00:03:20:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '172.17.0.2',
              prefixLength: 24,
              macAddress: '00:00:00:03:20:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e4', source: 'server-1', target: 'router-3' },
      { id: 'e3', source: 'router-2', target: 'server-1' },
      { id: 'e5', source: 'router-3', target: 'router-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- router-1 -- e2 -- router-2 -- e4 -- server-1
 *                         └──── e3 ──── router-3 -- e5 --┘
 */
export function failureFallbackTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.0.0/24', 'direct'),
        makeRouteEntry('router-1', '172.16.0.0/30', 'direct'),
        makeRouteEntry('router-1', '172.17.0.0/30', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', '172.16.0.2'),
        { ...makeRouteEntry('router-1', '0.0.0.0/0', '172.17.0.2'), metric: 5 },
      ],
    ],
    [
      'router-2',
      [
        makeRouteEntry('router-2', '172.16.0.0/30', 'direct'),
        makeRouteEntry('router-2', '203.0.113.0/24', 'direct'),
        makeRouteEntry('router-2', '10.0.0.0/24', '172.16.0.1'),
        makeRouteEntry('router-2', '0.0.0.0/0', '172.16.0.1'),
      ],
    ],
    [
      'router-3',
      [
        makeRouteEntry('router-3', '172.17.0.0/30', 'direct'),
        makeRouteEntry('router-3', '203.0.113.0/24', 'direct'),
        makeRouteEntry('router-3', '10.0.0.0/24', '172.17.0.1'),
        makeRouteEntry('router-3', '0.0.0.0/0', '172.17.0.1'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '172.16.0.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:01',
            },
            {
              id: 'eth2',
              name: 'eth2',
              ipAddress: '172.17.0.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:02',
            },
          ],
        },
      },
      {
        id: 'router-2',
        type: 'router',
        position: { x: 400, y: -120 },
        data: {
          label: 'R-2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '172.16.0.2',
              prefixLength: 30,
              macAddress: '00:00:00:02:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:02:00:01',
            },
          ],
        },
      },
      {
        id: 'router-3',
        type: 'router',
        position: { x: 400, y: 120 },
        data: {
          label: 'R-3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '172.17.0.2',
              prefixLength: 30,
              macAddress: '00:00:00:03:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.2',
              prefixLength: 24,
              macAddress: '00:00:00:03:00:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'router-2' },
      { id: 'e3', source: 'router-1', target: 'router-3' },
      { id: 'e4', source: 'router-2', target: 'server-1' },
      { id: 'e5', source: 'router-3', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

/** client-1 -- e1 -- nat-router -- e2 -- isp-router -- e3 -- server-1 */
export function natTopology(): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'nat-router',
      [
        makeRouteEntry('nat-router', '192.168.1.0/24', 'direct'),
        makeRouteEntry('nat-router', '203.0.113.0/30', 'direct'),
        makeRouteEntry('nat-router', '0.0.0.0/0', '203.0.113.2'),
      ],
    ],
    [
      'isp-router',
      [
        makeRouteEntry('isp-router', '203.0.113.0/30', 'direct'),
        makeRouteEntry('isp-router', '198.51.100.0/24', 'direct'),
        makeRouteEntry('isp-router', '192.168.1.0/24', '203.0.113.1'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '192.168.1.10',
          mac: CLIENT_MAC,
        },
      },
      {
        id: 'nat-router',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-NAT',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '192.168.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:11:00:00',
              nat: 'inside',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 30,
              macAddress: '00:00:00:11:00:01',
              nat: 'outside',
            },
          ],
          portForwardingRules: [
            { proto: 'tcp', externalPort: 8080, internalIp: '192.168.1.10', internalPort: 80 },
          ],
        },
      },
      {
        id: 'isp-router',
        type: 'router',
        position: { x: 400, y: 0 },
        data: {
          label: 'R-ISP',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '203.0.113.2',
              prefixLength: 30,
              macAddress: '00:00:00:12:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '198.51.100.1',
              prefixLength: 24,
              macAddress: '00:00:00:12:00:01',
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 600, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '198.51.100.10',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'nat-router' },
      { id: 'e2', source: 'nat-router', target: 'isp-router' },
      { id: 'e3', source: 'isp-router', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}

export function aclTopology(
  options: {
    stateful?: boolean;
    lanInboundAcl?: RouterInterface['inboundAcl'];
    wanInboundAcl?: RouterInterface['inboundAcl'];
  } = {},
): NetworkTopology {
  const routeTables = new Map<string, RouteEntry[]>([
    [
      'router-1',
      [
        makeRouteEntry('router-1', '10.0.1.0/24', 'direct'),
        makeRouteEntry('router-1', '203.0.113.0/24', 'direct'),
      ],
    ],
  ]);

  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.1.10', mac: CLIENT_MAC },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 200, y: 0 },
        data: {
          label: 'R-FW',
          role: 'router',
          layerId: 'l3',
          statefulFirewall: options.stateful === true,
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:10:00',
              ...(options.lanInboundAcl !== undefined ? { inboundAcl: options.lanInboundAcl } : {}),
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '203.0.113.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:10:01',
              ...(options.wanInboundAcl !== undefined ? { inboundAcl: options.wanInboundAcl } : {}),
            },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 400, y: 0 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.50',
          mac: SERVER_MAC,
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables,
  };
}
