import type { NetworkTopology } from '../types/topology';
import type { Scenario } from './types';

export function buildOspfConvergenceTopology(primaryLinkDown = false): NetworkTopology {
  const edges = [
    {
      id: 'e-c1-r1',
      source: 'c1',
      target: 'r1',
      targetHandle: 'lan1',
      type: 'smoothstep' as const,
    },
    {
      id: 'e-r1-r2',
      source: 'r1',
      target: 'r2',
      sourceHandle: 'to-r2',
      targetHandle: 'to-r1',
      type: 'smoothstep' as const,
    },
    {
      id: 'e-r1-r3',
      source: 'r1',
      target: 'r3',
      sourceHandle: 'to-r3',
      targetHandle: 'to-r1',
      type: 'smoothstep' as const,
    },
    {
      id: 'e-r2-r4',
      source: 'r2',
      target: 'r4',
      sourceHandle: 'to-r4',
      targetHandle: 'to-r2',
      type: 'smoothstep' as const,
    },
    {
      id: 'e-r3-r4',
      source: 'r3',
      target: 'r4',
      sourceHandle: 'to-r4',
      targetHandle: 'to-r3',
      type: 'smoothstep' as const,
    },
    {
      id: 'e-r4-c2',
      source: 'r4',
      target: 'c2',
      sourceHandle: 'lan4',
      type: 'smoothstep' as const,
    },
  ].filter((edge) => !(primaryLinkDown && edge.id === 'e-r2-r4'));

  return {
    nodes: [
      {
        id: 'c1',
        type: 'client',
        position: { x: 60, y: 200 },
        data: {
          label: 'C1',
          role: 'client',
          layerId: 'l7',
          ip: '10.1.0.10',
        },
      },
      {
        id: 'r1',
        type: 'router',
        position: { x: 260, y: 200 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'lan1',
              name: 'lan1',
              ipAddress: '10.1.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:01:00:00',
            },
            {
              id: 'to-r2',
              name: 'to-r2',
              ipAddress: '10.0.12.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:01',
            },
            {
              id: 'to-r3',
              name: 'to-r3',
              ipAddress: '10.0.13.1',
              prefixLength: 30,
              macAddress: '00:00:00:01:00:02',
            },
          ],
          ospfConfig: {
            routerId: '1.1.1.1',
            areas: [
              { areaId: '0.0.0.0', networks: ['10.1.0.0/24'] },
              { areaId: '0.0.0.0', networks: ['10.0.12.0/30'], cost: 1 },
              { areaId: '0.0.0.0', networks: ['10.0.13.0/30'], cost: 3 },
            ],
          },
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 500, y: 120 },
        data: {
          label: 'R2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'to-r1',
              name: 'to-r1',
              ipAddress: '10.0.12.2',
              prefixLength: 30,
              macAddress: '00:00:00:02:00:00',
            },
            {
              id: 'to-r4',
              name: 'to-r4',
              ipAddress: '10.0.24.1',
              prefixLength: 30,
              macAddress: '00:00:00:02:00:01',
            },
          ],
          ospfConfig: {
            routerId: '1.1.1.2',
            areas: [{ areaId: '0.0.0.0', networks: ['10.0.12.0/30', '10.0.24.0/30'], cost: 1 }],
          },
        },
      },
      {
        id: 'r3',
        type: 'router',
        position: { x: 500, y: 300 },
        data: {
          label: 'R3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'to-r1',
              name: 'to-r1',
              ipAddress: '10.0.13.2',
              prefixLength: 30,
              macAddress: '00:00:00:03:00:00',
            },
            {
              id: 'to-r4',
              name: 'to-r4',
              ipAddress: '10.0.34.1',
              prefixLength: 30,
              macAddress: '00:00:00:03:00:01',
            },
          ],
          ospfConfig: {
            routerId: '1.1.1.3',
            areas: [{ areaId: '0.0.0.0', networks: ['10.0.13.0/30', '10.0.34.0/30'], cost: 1 }],
          },
        },
      },
      {
        id: 'r4',
        type: 'router',
        position: { x: 760, y: 200 },
        data: {
          label: 'R4',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'to-r2',
              name: 'to-r2',
              ipAddress: '10.0.24.2',
              prefixLength: 30,
              macAddress: '00:00:00:04:00:00',
            },
            {
              id: 'to-r3',
              name: 'to-r3',
              ipAddress: '10.0.34.2',
              prefixLength: 30,
              macAddress: '00:00:00:04:00:01',
            },
            {
              id: 'lan4',
              name: 'lan4',
              ipAddress: '10.4.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:04:00:02',
            },
          ],
          ospfConfig: {
            routerId: '1.1.1.4',
            areas: [
              {
                areaId: '0.0.0.0',
                networks: ['10.0.24.0/30', '10.0.34.0/30', '10.4.0.0/24'],
                cost: 1,
              },
            ],
          },
        },
      },
      {
        id: 'c2',
        type: 'client',
        position: { x: 960, y: 200 },
        data: {
          label: 'C2',
          role: 'client',
          layerId: 'l7',
          ip: '10.4.0.10',
        },
      },
    ],
    edges,
    areas: [],
    routeTables: new Map(),
  };
}

export const ospfConvergence: Scenario = {
  metadata: {
    id: 'ospf-convergence',
    title: 'OSPF Preferred Path',
    summary:
      'Compare the lower-cost OSPF path with a recomputed backup path after the primary link is removed.',
    objective:
      'Observe route preference before and after the primary inter-router link is removed.',
    difficulty: 'advanced',
    protocols: ['ospf', 'ipv4', 'routing'],
    prerequisiteIds: ['basic-arp'],
  },
  topology: buildOspfConvergenceTopology(),
  sampleFlows: [
    { from: 'c1', to: 'c2', note: 'Healthy path prefers R2 before recomputing via R3' },
  ],
};
