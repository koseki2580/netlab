import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { AreaLegend } from '../../src/components/controls/AreaLegend';
import { RouteTable } from '../../src/components/controls/RouteTable';
import type { NetworkTopology } from '../../src/types/topology';
import type { NetworkArea } from '../../src/types/areas';
import DemoShell from '../DemoShell';

// ──────────────────────────────────────────────────────────────
// Classic DMZ topology:
//
//   [Private: 10.0.0.0/24]   →  FW-1  →  [DMZ: 172.16.1.0/24]  →  FW-2  →  [Public: 203.0.113.0/24]
//    Client + SW-1                          SW-DMZ + Web Server              SW-Pub + Internet
// ──────────────────────────────────────────────────────────────

const AREAS: NetworkArea[] = [
  {
    id: 'private',
    name: 'Private (10.0.0.0/24)',
    type: 'private',
    subnet: '10.0.0.0/24',
    devices: ['client-1', 'switch-1'],
    visualConfig: { x: 10, y: 30, width: 300, height: 340 },
  },
  {
    id: 'dmz',
    name: 'DMZ (172.16.1.0/24)',
    type: 'dmz',
    subnet: '172.16.1.0/24',
    devices: ['switch-dmz', 'web-server'],
    visualConfig: { x: 440, y: 30, width: 300, height: 340 },
  },
  {
    id: 'public',
    name: 'Public (203.0.113.0/24)',
    type: 'public',
    subnet: '203.0.113.0/24',
    devices: ['switch-pub', 'internet'],
    visualConfig: { x: 880, y: 30, width: 300, height: 340 },
  },
];

const TOPOLOGY: NetworkTopology = {
  nodes: [
    // ── Private zone ──
    {
      id: 'client-1',
      type: 'client',
      position: { x: 40, y: 180 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10', areaId: 'private' },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 200, y: 180 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        areaId: 'private',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:01:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
        ],
      },
    },

    // ── FW-1: Private → DMZ ──
    {
      id: 'fw-1',
      type: 'router',
      position: { x: 360, y: 180 },
      data: {
        label: 'FW-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
            macAddress: '00:00:00:02:00:00',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '172.16.1.1',
            prefixLength: 24,
            macAddress: '00:00:00:02:00:01',
          },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '172.16.1.0/24', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '172.16.1.2' },
          { destination: '0.0.0.0/0', nextHop: '172.16.1.2' },
        ],
      },
    },

    // ── DMZ zone ──
    {
      id: 'switch-dmz',
      type: 'switch',
      position: { x: 500, y: 180 },
      data: {
        label: 'SW-DMZ',
        role: 'switch',
        layerId: 'l2',
        areaId: 'dmz',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:03:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:03:00:01' },
        ],
      },
    },
    {
      id: 'web-server',
      type: 'server',
      position: { x: 660, y: 180 },
      data: {
        label: 'Web Server',
        role: 'server',
        layerId: 'l7',
        ip: '172.16.1.10',
        areaId: 'dmz',
      },
    },

    // ── FW-2: DMZ → Public ──
    {
      id: 'fw-2',
      type: 'router',
      position: { x: 800, y: 180 },
      data: {
        label: 'FW-2',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '172.16.1.2',
            prefixLength: 24,
            macAddress: '00:00:00:04:00:00',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '203.0.113.1',
            prefixLength: 24,
            macAddress: '00:00:00:04:00:01',
          },
        ],
        staticRoutes: [
          { destination: '172.16.1.0/24', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: '172.16.1.1' },
          { destination: '0.0.0.0/0', nextHop: '203.0.113.254' },
        ],
      },
    },

    // ── Public zone ──
    {
      id: 'switch-pub',
      type: 'switch',
      position: { x: 940, y: 180 },
      data: {
        label: 'SW-Pub',
        role: 'switch',
        layerId: 'l2',
        areaId: 'public',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:05:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:05:00:01' },
        ],
      },
    },
    {
      id: 'internet',
      type: 'server',
      position: { x: 1100, y: 180 },
      data: {
        label: 'Internet',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
        areaId: 'public',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1', type: 'smoothstep' },
    { id: 'e2', source: 'switch-1', target: 'fw-1', type: 'smoothstep' },
    { id: 'e3', source: 'fw-1', target: 'switch-dmz', type: 'smoothstep' },
    { id: 'e4', source: 'switch-dmz', target: 'web-server', type: 'smoothstep' },
    { id: 'e5', source: 'switch-dmz', target: 'fw-2', type: 'smoothstep' },
    { id: 'e6', source: 'fw-2', target: 'switch-pub', type: 'smoothstep' },
    { id: 'e7', source: 'switch-pub', target: 'internet', type: 'smoothstep' },
  ],
  areas: AREAS,
  routeTables: new Map(),
};

export const DMZ_DEMO_TOPOLOGY = TOPOLOGY;

export default function DmzDemo() {
  return (
    <DemoShell
      title="DMZ Segmentation"
      desc="Three-zone topology: Private → DMZ → Public with two border firewalls"
    >
      <NetlabProvider topology={TOPOLOGY}>
        <NetlabCanvas />
        <AreaLegend />
        <RouteTable />
      </NetlabProvider>
    </DemoShell>
  );
}
