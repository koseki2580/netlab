import type { TcpEvent, TcpState, TcpTransitionResult } from '../../types/tcp';

type TransitionKey = `${TcpState}:${Exclude<TcpEvent, 'RST_RECEIVED'>}`;

const TRANSITIONS: Partial<Record<TransitionKey, TcpTransitionResult>> = {
  'CLOSED:PASSIVE_OPEN': { newState: 'LISTEN', action: { type: 'NONE' } },
  'CLOSED:ACTIVE_OPEN': { newState: 'SYN_SENT', action: { type: 'SEND_SYN' } },
  'LISTEN:SYN_RECEIVED': { newState: 'SYN_RECEIVED', action: { type: 'SEND_SYN_ACK' } },
  'SYN_SENT:SYN_ACK_RECEIVED': { newState: 'ESTABLISHED', action: { type: 'SEND_ACK' } },
  'SYN_RECEIVED:ACK_RECEIVED': { newState: 'ESTABLISHED', action: { type: 'NONE' } },
  'ESTABLISHED:FIN_RECEIVED': { newState: 'CLOSE_WAIT', action: { type: 'SEND_ACK' } },
  'ESTABLISHED:CLOSE': { newState: 'FIN_WAIT_1', action: { type: 'SEND_FIN' } },
  'FIN_WAIT_1:ACK_RECEIVED': { newState: 'FIN_WAIT_2', action: { type: 'NONE' } },
  'FIN_WAIT_1:FIN_RECEIVED': { newState: 'TIME_WAIT', action: { type: 'SEND_ACK' } },
  'FIN_WAIT_2:FIN_RECEIVED': { newState: 'TIME_WAIT', action: { type: 'SEND_ACK' } },
  'CLOSE_WAIT:CLOSE': { newState: 'LAST_ACK', action: { type: 'SEND_FIN' } },
  'LAST_ACK:ACK_RECEIVED': { newState: 'CLOSED', action: { type: 'NONE' } },
  'TIME_WAIT:TIMEOUT': { newState: 'CLOSED', action: { type: 'NONE' } },
} as const;

export function transition(currentState: TcpState, event: TcpEvent): TcpTransitionResult {
  if (event === 'RST_RECEIVED') {
    return {
      newState: 'CLOSED',
      action: { type: 'NONE' },
    };
  }

  const result = TRANSITIONS[`${currentState}:${event}`];
  if (result) {
    return result;
  }

  return {
    newState: currentState,
    action: { type: 'ERROR', reason: `Invalid transition: ${currentState} + ${event}` },
  };
}

export function describeTransition(
  fromState: TcpState,
  event: TcpEvent,
  toState: TcpState,
): string {
  return `${fromState} --${event}--> ${toState}`;
}

export const TcpStateMachine = {
  transition,
  describeTransition,
};
