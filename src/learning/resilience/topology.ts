import type { RouteEntry } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { buildJourneyTopology } from '../packet-journey/topology';

function route(nodeId: string, destination: string, nextHop: string): RouteEntry {
  return { destination, nextHop, metric: 0, protocol: 'static', adminDistance: 1, nodeId };
}

/**
 * The Packet Journey network plus a **redundant R2–R3 link** (10.0.23.0/30),
 * with R3 carrying a route to R2's network (10.2.0.0/24) over it. The healthy
 * paths are unchanged, but the redundancy means some failures can be rerouted
 * around while others still can't — exactly the contrast the Resilience Lab
 * teaches.
 *
 * ```text
 *                ┌── R2 ── Server A (10.2.0.20)
 * Client ── R1 ──┤        │
 *                └── R3 ──┘ (redundant 10.0.23.0/30)
 *                     └── Server B (198.51.100.20)
 * ```
 */
export function buildResilienceTopology(): NetworkTopology {
  const topology = buildJourneyTopology();

  const r2 = topology.nodes.find((node) => node.id === 'r2');
  const r3 = topology.nodes.find((node) => node.id === 'r3');
  if (r2?.data.interfaces) {
    r2.data.interfaces = [
      ...r2.data.interfaces,
      {
        id: 'eth2',
        name: 'eth2',
        ipAddress: '10.0.23.1',
        prefixLength: 30,
        macAddress: '00:00:00:02:00:02',
      },
    ];
  }
  if (r3?.data.interfaces) {
    r3.data.interfaces = [
      ...r3.data.interfaces,
      {
        id: 'eth2',
        name: 'eth2',
        ipAddress: '10.0.23.2',
        prefixLength: 30,
        macAddress: '00:00:00:03:00:02',
      },
    ];
  }

  topology.edges = [
    ...topology.edges,
    { id: 'e-r2-r3', source: 'r2', target: 'r3', type: 'smoothstep' },
  ];

  topology.routeTables.get('r2')?.push(route('r2', '10.0.23.0/30', 'direct'));
  topology.routeTables.get('r3')?.push(route('r3', '10.0.23.0/30', 'direct'));
  // R3 can reach R2's LAN over the redundant link — the backup route.
  topology.routeTables.get('r3')?.push(route('r3', '10.2.0.0/24', '10.0.23.1'));

  return topology;
}
