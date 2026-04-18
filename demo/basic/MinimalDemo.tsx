import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 160, y: 200 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.1',
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 600, y: 200 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '10.0.0.2',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'server-1', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

export const MINIMAL_DEMO_TOPOLOGY = TOPOLOGY;

export default function MinimalDemo() {
  return (
    <DemoShell title="Minimal" desc="Two nodes directly connected">
      <NetlabProvider topology={TOPOLOGY}>
        <NetlabCanvas />
      </NetlabProvider>
    </DemoShell>
  );
}
