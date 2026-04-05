import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

// Central switch with 4 clients and 1 server arranged in a star
const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 380, y: 240 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:01:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:01:00:02' },
          { id: 'p3', name: 'fa0/3', macAddress: '00:00:00:01:00:03' },
          { id: 'p4', name: 'fa0/4', macAddress: '00:00:00:01:00:04' },
        ],
      },
    },
    {
      id: 'client-1',
      type: 'client',
      position: { x: 100, y: 80 },
      data: { label: 'Client-1', role: 'client', layerId: 'l7', ip: '192.168.0.11' },
    },
    {
      id: 'client-2',
      type: 'client',
      position: { x: 620, y: 80 },
      data: { label: 'Client-2', role: 'client', layerId: 'l7', ip: '192.168.0.12' },
    },
    {
      id: 'client-3',
      type: 'client',
      position: { x: 100, y: 380 },
      data: { label: 'Client-3', role: 'client', layerId: 'l7', ip: '192.168.0.13' },
    },
    {
      id: 'client-4',
      type: 'client',
      position: { x: 620, y: 380 },
      data: { label: 'Client-4', role: 'client', layerId: 'l7', ip: '192.168.0.14' },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 380, y: 440 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '192.168.0.1' },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1', type: 'smoothstep' },
    { id: 'e2', source: 'client-2', target: 'switch-1', type: 'smoothstep' },
    { id: 'e3', source: 'client-3', target: 'switch-1', type: 'smoothstep' },
    { id: 'e4', source: 'client-4', target: 'switch-1', type: 'smoothstep' },
    { id: 'e5', source: 'server-1', target: 'switch-1', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

export default function StarDemo() {
  return (
    <DemoShell title="Star Topology" desc="Central switch connecting four clients and a server">
      <NetlabProvider topology={TOPOLOGY}>
        <NetlabCanvas />
      </NetlabProvider>
    </DemoShell>
  );
}
