import type { NetworkTopology } from '../types/topology';
import type { Scenario } from './types';

export const DEFAULT_FRAGMENTED_ECHO_TUNNEL_MTU = 600;

export function buildFragmentedEchoTopology(
  tunnelMtu = DEFAULT_FRAGMENTED_ECHO_TUNNEL_MTU,
): NetworkTopology {
  return {
    nodes: [
      {
        id: 'host-a',
        type: 'client',
        position: { x: 70, y: 220 },
        data: {
          label: 'Host A',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:0a',
        },
      },
      {
        id: 'router-r1',
        type: 'router',
        position: { x: 310, y: 220 },
        data: {
          label: 'R1',
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
              id: 'tun0',
              name: 'tun0',
              ipAddress: '10.0.1.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.0.0/24', nextHop: 'direct' },
            { destination: '10.0.1.0/30', nextHop: 'direct' },
            { destination: '203.0.113.0/24', nextHop: '10.0.1.2' },
            { destination: '0.0.0.0/0', nextHop: '10.0.1.2' },
          ],
        },
      },
      {
        id: 'router-r2',
        type: 'router',
        position: { x: 590, y: 220 },
        data: {
          label: 'R2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'tun0',
              name: 'tun0',
              ipAddress: '10.0.1.2',
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
            { destination: '10.0.1.0/30', nextHop: 'direct' },
            { destination: '203.0.113.0/24', nextHop: 'direct' },
            { destination: '10.0.0.0/24', nextHop: '10.0.1.1' },
            { destination: '0.0.0.0/0', nextHop: '10.0.1.1' },
          ],
        },
      },
      {
        id: 'host-b',
        type: 'server',
        position: { x: 840, y: 220 },
        data: {
          label: 'Host B',
          role: 'server',
          layerId: 'l7',
          ip: '203.0.113.10',
          mac: '02:00:00:00:00:0b',
        },
      },
    ],
    edges: [
      {
        id: 'e-host-a',
        source: 'host-a',
        target: 'router-r1',
        targetHandle: 'eth0',
        type: 'smoothstep',
      },
      {
        id: 'e-tunnel',
        source: 'router-r1',
        target: 'router-r2',
        sourceHandle: 'tun0',
        targetHandle: 'tun0',
        type: 'smoothstep',
        data: { mtuBytes: tunnelMtu },
      },
      {
        id: 'e-host-b',
        source: 'router-r2',
        target: 'host-b',
        sourceHandle: 'eth1',
        type: 'smoothstep',
      },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export const fragmentedEcho: Scenario = {
  metadata: {
    id: 'fragmented-echo',
    title: 'Fragmented Echo',
    summary: 'Oversized ICMP crosses a low-MTU routed hop and reassembles at the destination.',
    objective: 'Observe fragmentation, fragment delivery, and reassembly completion.',
    difficulty: 'core',
    protocols: ['ipv4', 'icmp', 'fragmentation'],
    prerequisiteIds: ['basic-arp'],
  },
  topology: buildFragmentedEchoTopology(),
  brief: {
    goal: 'See why an oversized ICMP echo must fragment to cross a low-MTU tunnel, and where it reassembles.',
    est: '~2 min',
    prereq: [
      { id: 'basic-arp', label: 'arp', done: true },
      { id: 'ipv4-basics', label: 'ipv4', done: true },
    ],
    watchPoints: [
      { step: 1, kind: 'route', label: 'Host A sends an echo larger than the tunnel MTU (600B)' },
      { step: 2, kind: 'fragment', label: 'R1 splits the packet into fragments at the tunnel hop' },
      { step: 4, kind: 'reassembly', label: 'Host B reassembles the fragments before replying' },
    ],
    conclusion: {
      headline:
        'The oversized echo was fragmented at the tunnel and reassembled at the destination.',
      detail:
        'A routed hop with a smaller MTU forced IPv4 fragmentation; only the receiving host reassembles, so every fragment had to arrive.',
      actions: [{ id: 'gallery', label: 'browse more scenarios →', kind: 'primary' }],
    },
  },
  sampleFlows: [{ from: 'host-a', to: 'host-b', note: 'Low tunnel MTU forces IPv4 fragmentation' }],
};
