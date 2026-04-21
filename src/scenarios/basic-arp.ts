import type { Scenario } from './types';

export const basicArp: Scenario = {
  metadata: {
    id: 'basic-arp',
    title: 'ARP Basics',
    summary: 'Send one IP packet and watch ARP resolve the first-hop MAC before forwarding.',
    objective: 'Observe ARP request/reply exchange and the sender cache filling in.',
    difficulty: 'intro',
    protocols: ['arp', 'ipv4'],
    prerequisiteIds: [],
  },
  topology: {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 80, y: 180 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 360, y: 180 },
        data: {
          label: 'Router',
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
          staticRoutes: [
            { destination: '10.0.0.0/24', nextHop: 'direct' },
            { destination: '203.0.113.0/24', nextHop: 'direct' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 640, y: 180 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'router-1' },
      { id: 'e2', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map(),
  },
  sampleFlows: [{ from: 'client-1', to: 'server-1', note: 'First packet triggers ARP resolution' }],
};
