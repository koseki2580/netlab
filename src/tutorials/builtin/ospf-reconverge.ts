import type { Tutorial } from '../types';
import { mostRecentTrace, routeEntriesForNode } from './helpers';

function hasPreferredRoute(state: Parameters<Tutorial['steps'][number]['predicate']>[0]['state']) {
  return routeEntriesForNode(state, 'r1').some(
    (entry) =>
      entry.destination === '10.4.0.0/24' &&
      entry.nextHop === '10.0.12.2' &&
      entry.metric === 2 &&
      entry.protocol === 'ospf',
  );
}

function hasBackupRoute(state: Parameters<Tutorial['steps'][number]['predicate']>[0]['state']) {
  return routeEntriesForNode(state, 'r1').some(
    (entry) =>
      entry.destination === '10.4.0.0/24' &&
      entry.nextHop === '10.0.13.2' &&
      entry.metric === 4 &&
      entry.protocol === 'ospf',
  );
}

export const ospfReconverge: Tutorial = {
  id: 'ospf-reconverge',
  scenarioId: 'ospf-convergence',
  title: 'OSPF Preferred Path Recompute',
  summary:
    'Observe the lower-cost path first, then recompute to the backup path after the primary link is removed.',
  difficulty: 'advanced',
  steps: [
    {
      id: 'initial-convergence',
      title: 'Observe the initial preferred route',
      description: 'R1 should initially prefer the lower-cost path toward C2 via R2.',
      predicate: ({ state }) => hasPreferredRoute(state),
    },
    {
      id: 'backup-route-selected',
      title: 'Remove the primary link and observe the new route',
      description: 'Toggle the primary inter-router link down so R1 recomputes via R3.',
      hint: 'Use the primary-link toggle, then check that R1 now prefers 10.0.13.2.',
      predicate: ({ state }) => hasBackupRoute(state),
    },
    {
      id: 'probe-follows-r3',
      title: 'Send traffic on the recomputed path',
      description: 'Send the probe again and confirm R1 forwards through R3.',
      hint: 'The latest trace should show R1 forwarding directly to R3.',
      predicate: ({ state }) =>
        mostRecentTrace(state)?.hops.some(
          (hop) => hop.nodeId === 'r1' && hop.toNodeId === 'r3' && hop.activeEdgeId === 'e-r1-r3',
        ) ?? false,
    },
    {
      id: 'probe-delivers',
      title: 'Confirm the recomputed path still delivers',
      description: 'The latest probe should reach C2 after the route changes.',
      predicate: ({ state }) =>
        mostRecentTrace(state)?.status === 'delivered' &&
        (mostRecentTrace(state)?.hops.some((hop) => hop.nodeId === 'r3') ?? false),
    },
  ],
};
