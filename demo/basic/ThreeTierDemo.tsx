import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 100, y: 200 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '192.168.1.10',
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 400, y: 200 },
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
      position: { x: 700, y: 200 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.20',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1', type: 'smoothstep' },
    { id: 'e2', source: 'switch-1', target: 'server-1', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

export const THREE_TIER_DEMO_TOPOLOGY = TOPOLOGY;

export default function ThreeTierDemo() {
  return (
    <DemoShell title="Three-Tier LAN" desc="Client → Switch → Server with L2 port configuration">
      <NetlabProvider topology={TOPOLOGY}>
        <NetlabCanvas />
      </NetlabProvider>
    </DemoShell>
  );
}
