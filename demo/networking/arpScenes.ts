/**
 * The ARP lesson's two scenes. `routed` is the lesson's own: Client and Server
 * on two networks, so the Client asks for the Router. `local` puts a Printer
 * on the Client's own network: the Client asks for the Printer itself, and the
 * Router plays no part (`?scene=local`).
 */
import type { NetworkTopology } from '../../src/types/topology';

export type ArpScene = 'routed' | 'local';

export function arpSceneFromSearch(search: string): ArpScene {
  return new URLSearchParams(search).get('scene') === 'local' ? 'local' : 'routed';
}

const ROUTER_LEFT_IP = '10.0.0.1';

export const ARP_LOCAL = {
  from: 'client-1',
  to: 'printer-1',
  target: '10.0.0.20',
  gateway: ROUTER_LEFT_IP,
  topology: {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 80, y: 120 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: 'aa:00:00:00:00:10',
        },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 340, y: 200 },
        data: {
          label: 'Switch',
          role: 'switch',
          layerId: 'l2',
          ports: [0, 1, 2].map((index) => ({
            id: `p${index}`,
            name: `fa0/${index}`,
            macAddress: `00:00:00:0${index}:00:0${index}`,
          })),
        },
      },
      {
        id: 'printer-1',
        type: 'client',
        position: { x: 80, y: 300 },
        data: {
          label: 'Printer',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.20',
          mac: 'aa:00:00:00:00:20',
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 600, y: 200 },
        data: {
          label: 'Router',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: ROUTER_LEFT_IP,
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
          ],
          staticRoutes: [{ destination: '10.0.0.0/24', nextHop: 'direct' }],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1' },
      { id: 'e2', source: 'printer-1', target: 'switch-1' },
      { id: 'e3', source: 'switch-1', target: 'router-1' },
    ],
    areas: [],
    routeTables: new Map(),
  } satisfies NetworkTopology,
} as const;
