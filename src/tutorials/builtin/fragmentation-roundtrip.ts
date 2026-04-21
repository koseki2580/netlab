import type { Tutorial } from '../types';
import { hasHopAction, mostRecentTrace, traces } from './helpers';

export const fragmentationRoundtrip: Tutorial = {
  id: 'fragmentation-roundtrip',
  scenarioId: 'fragmented-echo',
  title: 'IPv4 Fragmentation Round Trip',
  summary: 'Watch a low-MTU hop split an oversized packet and reassemble it at the destination.',
  difficulty: 'core',
  steps: [
    {
      id: 'send-oversized-ping',
      title: 'Send an oversized packet',
      description: 'Kick off the ICMP echo so the topology has a trace to inspect.',
      predicate: ({ state }) => traces(state).length >= 1,
    },
    {
      id: 'router-fragments',
      title: 'Observe the router fragment the packet',
      description: 'The low-MTU routed hop should emit one or more fragment actions.',
      hint: 'Look for hops marked fragment on the tunnel egress.',
      predicate: ({ state }) => hasHopAction(state, 'fragment'),
    },
    {
      id: 'destination-reassembles',
      title: 'Observe reassembly at the destination',
      description: 'The destination should report reassembly completion once all fragments arrive.',
      hint: 'The final host marks reassembly-complete when all pieces are present.',
      predicate: ({ state }) => hasHopAction(state, 'reassembly-complete'),
    },
    {
      id: 'trace-delivered',
      title: 'Confirm the fragmented exchange still delivers',
      description: 'The most recent trace should finish in a delivered state.',
      predicate: ({ state }) => mostRecentTrace(state)?.status === 'delivered',
    },
  ],
};
