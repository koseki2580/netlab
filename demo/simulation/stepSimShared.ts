import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';

export const STEP_SIM_TOPOLOGY: NetworkTopology = {
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
      position: { x: 260, y: 200 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:01:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '172.16.0.1', prefixLength: 30, macAddress: '00:00:00:01:00:01' },
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
      position: { x: 460, y: 200 },
      data: {
        label: 'R-2',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '172.16.0.2', prefixLength: 30, macAddress: '00:00:00:02:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '192.168.1.1', prefixLength: 30, macAddress: '00:00:00:02:00:01' },
        ],
        staticRoutes: [
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '192.168.1.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '192.168.1.2' },
          { destination: '10.0.0.0/24', nextHop: '172.16.0.1' },
          { destination: '0.0.0.0/0', nextHop: '192.168.1.2' },
        ],
      },
    },
    {
      id: 'router-3',
      type: 'router',
      position: { x: 660, y: 200 },
      data: {
        label: 'R-3',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '192.168.1.2', prefixLength: 30, macAddress: '00:00:00:03:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:03:00:01' },
        ],
        staticRoutes: [
          { destination: '192.168.1.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: '192.168.1.1' },
          { destination: '0.0.0.0/0', nextHop: '192.168.1.1' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 860, y: 200 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1' },
    { id: 'e2', source: 'router-1', target: 'router-2' },
    { id: 'e3', source: 'router-2', target: 'router-3' },
    { id: 'e4', source: 'router-3', target: 'server-1' },
  ],
  areas: [],
  routeTables: new Map(),
};

export function buildStepSimPacket(topology: NetworkTopology): InFlightPacket | null {
  const client = topology.nodes.find((node) => node.data.role === 'client');
  const server = topology.nodes.find((node) => node.data.role === 'server');
  if (!client || !server) return null;

  const srcIp = (client.data.ip as string | undefined) ?? '0.0.0.0';
  const dstIp = (server.data.ip as string | undefined) ?? '0.0.0.0';

  return {
    id: `pkt-${Date.now()}`,
    srcNodeId: client.id,
    dstNodeId: server.id,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET / HTTP/1.1' },
        },
      },
    },
    currentDeviceId: client.id,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}
