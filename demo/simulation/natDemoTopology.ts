import type { NetworkTopology } from '../../src/types/topology';

export const NAT_DEMO_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 110 },
      data: { label: 'Client A', role: 'client', layerId: 'l7', ip: '192.168.1.10' },
    },
    {
      id: 'client-2',
      type: 'client',
      position: { x: 60, y: 290 },
      data: { label: 'Client B', role: 'client', layerId: 'l7', ip: '192.168.1.20' },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 250, y: 200 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:20:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:20:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:20:00:02' },
        ],
      },
    },
    {
      id: 'nat-router',
      type: 'router',
      position: { x: 460, y: 200 },
      data: {
        label: 'R-Edge',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '192.168.1.1',
            prefixLength: 24,
            macAddress: '00:00:00:11:00:00',
            nat: 'inside',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '203.0.113.1',
            prefixLength: 30,
            macAddress: '00:00:00:11:00:01',
            nat: 'outside',
          },
        ],
        staticRoutes: [
          { destination: '192.168.1.0/24', nextHop: 'direct' },
          { destination: '203.0.113.0/30', nextHop: 'direct' },
          { destination: '198.51.100.0/24', nextHop: '203.0.113.2' },
          { destination: '0.0.0.0/0', nextHop: '203.0.113.2' },
        ],
        portForwardingRules: [
          { proto: 'tcp', externalPort: 8080, internalIp: '192.168.1.10', internalPort: 80 },
        ],
      },
    },
    {
      id: 'isp-router',
      type: 'router',
      position: { x: 680, y: 200 },
      data: {
        label: 'R-ISP',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '203.0.113.2',
            prefixLength: 30,
            macAddress: '00:00:00:12:00:00',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '198.51.100.1',
            prefixLength: 24,
            macAddress: '00:00:00:12:00:01',
          },
        ],
        staticRoutes: [
          { destination: '203.0.113.0/30', nextHop: 'direct' },
          { destination: '198.51.100.0/24', nextHop: 'direct' },
          { destination: '192.168.1.0/24', nextHop: '203.0.113.1' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 900, y: 200 },
      data: { label: 'Internet Host', role: 'server', layerId: 'l7', ip: '198.51.100.10' },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1' },
    { id: 'e2', source: 'client-2', target: 'switch-1' },
    { id: 'e3', source: 'switch-1', target: 'nat-router' },
    { id: 'e4', source: 'nat-router', target: 'isp-router' },
    { id: 'e5', source: 'isp-router', target: 'server-1' },
  ],
  areas: [],
  routeTables: new Map(),
};
