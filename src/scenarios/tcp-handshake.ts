import type { Scenario } from './types';

export const tcpHandshake: Scenario = {
  metadata: {
    id: 'tcp-handshake',
    title: 'TCP Three-Way Handshake',
    summary: 'Trace SYN, SYN-ACK, and ACK across a routed hop between client and server.',
    objective: 'Confirm the three packets and resulting connection establishment.',
    difficulty: 'core',
    protocols: ['tcp', 'ipv4'],
    prerequisiteIds: ['basic-arp'],
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
          ip: '10.0.1.10',
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
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:01',
            },
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
          ip: '10.0.2.10',
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
  sampleFlows: [
    { from: 'client-1', to: 'server-1', note: 'Client opens a TCP connection on port 80' },
  ],
};
