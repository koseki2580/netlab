import type { NetworkTopology } from '../../src/types/topology';
import { TaskLesson } from '../components/LessonTask';
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
  edges: [{ id: 'e1', source: 'client-1', target: 'server-1', type: 'smoothstep' }],
  areas: [],
  routeTables: new Map(),
};

export const MINIMAL_DEMO_TOPOLOGY = TOPOLOGY;

export default function MinimalDemo() {
  return (
    <DemoShell title="Minimal" desc="Two nodes directly connected">
      <TaskLesson
        topology={TOPOLOGY}
        from="client-1"
        to="server-1"
        goal={{
          en: 'Two devices joined by one cable. Send a packet from Client to Server and watch it arrive.',
          ja: '2 台の機器が 1 本のケーブルでつながっています。Client から Server へパケットを送り、届くのを確かめましょう。',
        }}
        takeaway={{
          en: 'Devices on the same cable talk directly: nothing sits between them, so the packet goes straight across.',
          ja: '同じケーブルでつながった機器どうしは直接やりとりします。間に何もないので、パケットはそのまま相手に届きます。',
        }}
      />
    </DemoShell>
  );
}
