import { describe, expect, it } from 'vitest';
import { TcpStateMachine, describeTransition, transition } from './TcpStateMachine';
import type { TcpState } from '../../types/tcp';

describe('TcpStateMachine', () => {
  describe('transition', () => {
    it('CLOSED + ACTIVE_OPEN -> SYN_SENT with SEND_SYN', () => {
      expect(transition('CLOSED', 'ACTIVE_OPEN')).toEqual({
        newState: 'SYN_SENT',
        action: { type: 'SEND_SYN' },
      });
    });

    it('SYN_SENT + SYN_ACK_RECEIVED -> ESTABLISHED with SEND_ACK', () => {
      expect(transition('SYN_SENT', 'SYN_ACK_RECEIVED')).toEqual({
        newState: 'ESTABLISHED',
        action: { type: 'SEND_ACK' },
      });
    });

    it('CLOSED + PASSIVE_OPEN -> LISTEN with NONE', () => {
      expect(transition('CLOSED', 'PASSIVE_OPEN')).toEqual({
        newState: 'LISTEN',
        action: { type: 'NONE' },
      });
    });

    it('LISTEN + SYN_RECEIVED -> SYN_RECEIVED with SEND_SYN_ACK', () => {
      expect(transition('LISTEN', 'SYN_RECEIVED')).toEqual({
        newState: 'SYN_RECEIVED',
        action: { type: 'SEND_SYN_ACK' },
      });
    });

    it('SYN_RECEIVED + ACK_RECEIVED -> ESTABLISHED with NONE', () => {
      expect(transition('SYN_RECEIVED', 'ACK_RECEIVED')).toEqual({
        newState: 'ESTABLISHED',
        action: { type: 'NONE' },
      });
    });

    it('ESTABLISHED + CLOSE -> FIN_WAIT_1 with SEND_FIN', () => {
      expect(transition('ESTABLISHED', 'CLOSE')).toEqual({
        newState: 'FIN_WAIT_1',
        action: { type: 'SEND_FIN' },
      });
    });

    it('FIN_WAIT_1 + ACK_RECEIVED -> FIN_WAIT_2 with NONE', () => {
      expect(transition('FIN_WAIT_1', 'ACK_RECEIVED')).toEqual({
        newState: 'FIN_WAIT_2',
        action: { type: 'NONE' },
      });
    });

    it('FIN_WAIT_2 + FIN_RECEIVED -> TIME_WAIT with SEND_ACK', () => {
      expect(transition('FIN_WAIT_2', 'FIN_RECEIVED')).toEqual({
        newState: 'TIME_WAIT',
        action: { type: 'SEND_ACK' },
      });
    });

    it('TIME_WAIT + TIMEOUT -> CLOSED with NONE', () => {
      expect(transition('TIME_WAIT', 'TIMEOUT')).toEqual({
        newState: 'CLOSED',
        action: { type: 'NONE' },
      });
    });

    it('ESTABLISHED + FIN_RECEIVED -> CLOSE_WAIT with SEND_ACK', () => {
      expect(transition('ESTABLISHED', 'FIN_RECEIVED')).toEqual({
        newState: 'CLOSE_WAIT',
        action: { type: 'SEND_ACK' },
      });
    });

    it('CLOSE_WAIT + CLOSE -> LAST_ACK with SEND_FIN', () => {
      expect(transition('CLOSE_WAIT', 'CLOSE')).toEqual({
        newState: 'LAST_ACK',
        action: { type: 'SEND_FIN' },
      });
    });

    it('LAST_ACK + ACK_RECEIVED -> CLOSED with NONE', () => {
      expect(transition('LAST_ACK', 'ACK_RECEIVED')).toEqual({
        newState: 'CLOSED',
        action: { type: 'NONE' },
      });
    });

    it('FIN_WAIT_1 + FIN_RECEIVED -> TIME_WAIT with SEND_ACK', () => {
      expect(transition('FIN_WAIT_1', 'FIN_RECEIVED')).toEqual({
        newState: 'TIME_WAIT',
        action: { type: 'SEND_ACK' },
      });
    });

    it('any state + RST_RECEIVED -> CLOSED with NONE', () => {
      const states: TcpState[] = [
        'CLOSED',
        'LISTEN',
        'SYN_SENT',
        'SYN_RECEIVED',
        'ESTABLISHED',
        'FIN_WAIT_1',
        'FIN_WAIT_2',
        'CLOSE_WAIT',
        'LAST_ACK',
        'TIME_WAIT',
      ];

      states.forEach((state) => {
        expect(TcpStateMachine.transition(state, 'RST_RECEIVED')).toEqual({
          newState: 'CLOSED',
          action: { type: 'NONE' },
        });
      });
    });

    it('CLOSED + ACK_RECEIVED -> CLOSED with ERROR', () => {
      expect(transition('CLOSED', 'ACK_RECEIVED')).toEqual({
        newState: 'CLOSED',
        action: { type: 'ERROR', reason: 'Invalid transition: CLOSED + ACK_RECEIVED' },
      });
    });

    it('LISTEN + CLOSE -> returns ERROR for invalid transition', () => {
      expect(transition('LISTEN', 'CLOSE')).toEqual({
        newState: 'LISTEN',
        action: { type: 'ERROR', reason: 'Invalid transition: LISTEN + CLOSE' },
      });
    });

    it('ESTABLISHED + SYN_RECEIVED -> returns ERROR', () => {
      expect(transition('ESTABLISHED', 'SYN_RECEIVED')).toEqual({
        newState: 'ESTABLISHED',
        action: { type: 'ERROR', reason: 'Invalid transition: ESTABLISHED + SYN_RECEIVED' },
      });
    });
  });

  describe('describeTransition', () => {
    it('returns readable description for SYN_SENT -> ESTABLISHED', () => {
      expect(describeTransition('SYN_SENT', 'SYN_ACK_RECEIVED', 'ESTABLISHED')).toBe(
        'SYN_SENT --SYN_ACK_RECEIVED--> ESTABLISHED',
      );
    });

    it('returns readable description for connection teardown step', () => {
      expect(describeTransition('ESTABLISHED', 'FIN_RECEIVED', 'CLOSE_WAIT')).toBe(
        'ESTABLISHED --FIN_RECEIVED--> CLOSE_WAIT',
      );
    });
  });
});
