import type { NetworkTopology } from '../../src/types/topology';
import { TaskLesson } from '../components/LessonTask';
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

export const STAR_DEMO_TOPOLOGY = TOPOLOGY;

export default function StarDemo() {
  return (
    <DemoShell title="Star Topology" desc="Central switch connecting four clients and a server">
      <TaskLesson
        topology={TOPOLOGY}
        from="client-1"
        to="server-1"
        goal={{
          en: 'Four clients and a server hang off one switch. Send a packet from Client-1 to the Server.',
          ja: '4 台のクライアントとサーバが 1 台のスイッチにつながっています。Client-1 からサーバへパケットを送りましょう。',
        }}
        takeaway={{
          en: 'Every device reaches every other through the centre switch, and this packet only crosses the links it needs.',
          ja: 'すべての機器は中央のスイッチを通してお互いに届きます。このパケットが通るのは、必要なリンクだけです。',
        }}
      />
    </DemoShell>
  );
}
