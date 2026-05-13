/**
 * @property-seed 0x5a4b12 plan/52 TCP handshake reachability property.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { transition } from '../../layers/l4-transport/TcpStateMachine';
import type { TcpEvent, TcpState } from '../../types/tcp';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { tcpStateReachable, type TcpStateTransition } from '../../testing/properties/oracles';

const clientEvents: readonly TcpEvent[] = ['ACTIVE_OPEN', 'SYN_ACK_RECEIVED'];
const serverEvents: readonly TcpEvent[] = ['PASSIVE_OPEN', 'SYN_RECEIVED', 'ACK_RECEIVED'];

function runPath(start: TcpState, events: readonly TcpEvent[]): TcpStateTransition[] {
  let state = start;
  const log: TcpStateTransition[] = [];
  for (const event of events) {
    const next = transition(state, event);
    log.push({ from: state, event, to: next.newState });
    state = next.newState;
  }
  return log;
}

describe('TCP handshake properties', () => {
  it('keeps generated client/server handshake prefixes reachable', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: clientEvents.length }),
        fc.integer({ min: 0, max: serverEvents.length }),
        (clientLength, serverLength) => {
          expect(() =>
            tcpStateReachable(runPath('CLOSED', clientEvents.slice(0, clientLength))),
          ).not.toThrow();
          expect(() =>
            tcpStateReachable(runPath('CLOSED', serverEvents.slice(0, serverLength))),
          ).not.toThrow();
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
