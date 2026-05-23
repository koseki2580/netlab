import type { NetworkTopology } from '../types/topology';
import { buildOspfConvergenceTopology } from './ospf-convergence';
import type { Scenario } from './types';

/**
 * RIP networks per router — the same address layout as the OSPF convergence
 * scenario, so the two can be opened side by side (M4 compare group).
 */
const RIP_NETWORKS: Readonly<Record<string, string[]>> = {
  r1: ['10.1.0.0/24', '10.0.12.0/30', '10.0.13.0/30'],
  r2: ['10.0.12.0/30', '10.0.24.0/30'],
  r3: ['10.0.13.0/30', '10.0.34.0/30'],
  r4: ['10.0.24.0/30', '10.0.34.0/30', '10.4.0.0/24'],
};

/**
 * Reuse the OSPF convergence topology (identical nodes, edges, and addressing)
 * but drive it with RIP — so a compare view shows the same network converging
 * under distance-vector instead of link-state routing.
 */
export function buildRipConvergenceTopology(primaryLinkDown = false): NetworkTopology {
  const base = buildOspfConvergenceTopology(primaryLinkDown);
  return {
    ...base,
    nodes: base.nodes.map((node) => {
      if (node.data.role !== 'router') return node;
      const networks = RIP_NETWORKS[node.id];
      if (!networks) return node;
      const { ospfConfig: _ospfConfig, ...rest } = node.data;
      return { ...node, data: { ...rest, ripConfig: { version: 2, networks } } };
    }),
  };
}

export const ripConvergence: Scenario = {
  metadata: {
    id: 'rip-convergence',
    title: 'RIP Convergence',
    summary:
      'The same four-router network as OSPF, converged with RIP so you can compare distance-vector against link-state.',
    objective:
      'Observe how RIP reaches the destination network and how its metric differs from OSPF.',
    difficulty: 'advanced',
    protocols: ['rip', 'ipv4', 'routing'],
    prerequisiteIds: ['basic-arp'],
  },
  topology: buildRipConvergenceTopology(),
  topologyGroup: 'convergence-4router',
  brief: {
    goal: 'Watch RIP build a route to the far network by hop count, and compare its convergence with OSPF on the identical topology.',
    est: '~3 min',
    prereq: [
      { id: 'basic-arp', label: 'arp', done: true },
      { id: 'static-routes', label: 'static', done: true },
      { id: 'rip-basics', label: 'rip-b', done: false },
    ],
    watchPoints: [
      { step: 1, kind: 'route', label: 'R1 forwards toward C2 along the RIP-learned path' },
      { step: 3, kind: 'route', label: 'RIP picks the path with the fewest router hops' },
      {
        step: 5,
        kind: 'route',
        label: 'Compare the resulting metric with the OSPF cost-based choice',
      },
    ],
    conclusion: {
      headline: 'RIP reached the destination using hop count, not link cost.',
      detail:
        'Distance-vector RIP counts router hops, so its path can differ from OSPF, which weighs configured link costs — open both side by side to see the contrast.',
      actions: [{ id: 'gallery', label: 'browse more scenarios →', kind: 'primary' }],
    },
  },
  sampleFlows: [{ from: 'c1', to: 'c2', note: 'RIP-learned path from C1 to C2' }],
};
