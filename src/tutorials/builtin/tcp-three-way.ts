import type { Tutorial } from '../types';
import { hasTraceLabel } from './helpers';

export const tcpThreeWay: Tutorial = {
  id: 'tcp-three-way',
  scenarioId: 'tcp-handshake',
  title: 'TCP Three-Way Handshake',
  summary: 'Follow SYN, SYN-ACK, and ACK until the connection is established.',
  difficulty: 'core',
  steps: [
    {
      id: 'client-sends-syn',
      title: 'Send the initial SYN',
      description: 'Start the TCP connection and confirm the SYN trace appears.',
      predicate: ({ state }) => hasTraceLabel(state, 'TCP SYN'),
    },
    {
      id: 'server-sends-syn-ack',
      title: 'Observe the SYN-ACK response',
      description: 'The server should answer with SYN-ACK once the SYN arrives.',
      hint: 'Check the trace list for the TCP SYN-ACK packet.',
      predicate: ({ state }) => hasTraceLabel(state, 'TCP SYN-ACK'),
    },
    {
      id: 'client-finishes-handshake',
      title: 'Observe the final ACK',
      description: 'The client completes the handshake when the ACK trace appears.',
      hint: 'The handshake is complete once SYN, SYN-ACK, and ACK all exist.',
      predicate: ({ state }) =>
        hasTraceLabel(state, 'TCP SYN') &&
        hasTraceLabel(state, 'TCP SYN-ACK') &&
        hasTraceLabel(state, 'TCP ACK'),
    },
  ],
};
