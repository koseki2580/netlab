import type { Scenario } from './types';

export const stpLoop: Scenario = {
  metadata: {
    id: 'stp-loop',
    title: 'STP Loop Prevention',
    summary: 'Three switches form a triangle; STP blocks one port to remove the L2 loop.',
    objective: 'Observe root bridge election and the blocked redundant link.',
    difficulty: 'core',
    protocols: ['stp', 'ethernet'],
    prerequisiteIds: ['basic-arp'],
  },
  topology: {
    nodes: [
      {
        id: 'sw1',
        type: 'switch',
        position: { x: 120, y: 120 },
        data: {
          label: 'SW1',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'p0', name: 'fa0/0', macAddress: '02:00:00:00:01:00' },
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:00:01:01' },
          ],
          stpConfig: { priority: 24576 },
        },
      },
      {
        id: 'sw2',
        type: 'switch',
        position: { x: 360, y: 120 },
        data: {
          label: 'SW2',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'p0', name: 'fa0/0', macAddress: '02:00:00:00:02:00' },
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:00:02:01' },
          ],
        },
      },
      {
        id: 'sw3',
        type: 'switch',
        position: { x: 240, y: 320 },
        data: {
          label: 'SW3',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'p0', name: 'fa0/0', macAddress: '02:00:00:00:03:00' },
            { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:00:03:01' },
          ],
        },
      },
    ],
    edges: [
      { id: 'e-sw1-sw2', source: 'sw1', target: 'sw2', sourceHandle: 'p0', targetHandle: 'p0' },
      { id: 'e-sw2-sw3', source: 'sw2', target: 'sw3', sourceHandle: 'p1', targetHandle: 'p0' },
      { id: 'e-sw3-sw1', source: 'sw3', target: 'sw1', sourceHandle: 'p1', targetHandle: 'p1' },
    ],
    areas: [],
    routeTables: new Map(),
  },
  sampleFlows: [{ from: 'sw1', to: 'sw3', note: 'STP blocks one redundant segment' }],
};
