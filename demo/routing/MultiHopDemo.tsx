import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { RouteTable } from '../../src/components/controls/RouteTable';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

// ──────────────────────────────────────────────────────────────
// Client → R1 → R2 → Server
//
// Subnets:
//   10.0.0.0/24   — client side  (client-1 : 10.0.0.10, R1 eth0 : 10.0.0.1)
//   172.16.0.0/30 — inter-router (R1 eth1 : 172.16.0.1, R2 eth0 : 172.16.0.2)
//   203.0.113.0/24 — server side (R2 eth1 : 203.0.113.1, server-1 : 203.0.113.10)
// ──────────────────────────────────────────────────────────────

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 200 },
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
      position: { x: 300, y: 200 },
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
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '172.16.0.2' },
          { destination: '0.0.0.0/0', nextHop: '172.16.0.2' },
        ],
      },
    },
    {
      id: 'router-2',
      type: 'router',
      position: { x: 560, y: 200 },
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
        staticRoutes: [
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: '172.16.0.1' },
          { destination: '0.0.0.0/0', nextHop: '203.0.113.254' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 800, y: 200 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1', type: 'smoothstep' },
    { id: 'e2', source: 'router-1', target: 'router-2', type: 'smoothstep' },
    { id: 'e3', source: 'router-2', target: 'server-1', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

export const MULTI_HOP_DEMO_TOPOLOGY = TOPOLOGY;

export default function MultiHopDemo() {
  return (
    <DemoShell
      title="Multi-Hop Routing"
      desc="Traffic crosses two routers through three distinct subnets"
    >
      <NetlabProvider topology={TOPOLOGY}>
        <NetlabCanvas />
        <RouteTable />
      </NetlabProvider>
    </DemoShell>
  );
}
