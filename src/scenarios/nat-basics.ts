import type { Scenario } from './types';

export const NAT_BASICS_TOPOLOGY: Scenario['topology'] = {
  nodes: [
    {
      id: 'nat-router',
      type: 'router',
      position: { x: 0, y: 0 },
      data: { label: 'R-Edge', role: 'router', layerId: 'l3' },
    },
  ],
  edges: [],
  areas: [],
  routeTables: new Map(),
};

export const natBasics: Scenario = {
  metadata: {
    id: 'nat-basics',
    title: 'NAT Basics',
    summary: 'Sandbox NAT rule editing.',
    objective: 'Add and remove a DNAT rule.',
    difficulty: 'core',
    protocols: ['nat'],
    prerequisiteIds: [],
  },
  topology: NAT_BASICS_TOPOLOGY,
  sampleFlows: [{ from: 'server-1', to: 'nat-router' }],
};
