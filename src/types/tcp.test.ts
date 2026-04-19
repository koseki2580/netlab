import { describe, expect, it } from 'vitest';
import type { TcpAction, TcpConnection, TcpFourTuple, TcpState, TcpTransitionResult } from './tcp';

describe('TcpState values', () => {
  it('CLOSED and ESTABLISHED are valid states', () => {
    const closed: TcpState = 'CLOSED';
    const established: TcpState = 'ESTABLISHED';
    expect(closed).toBe('CLOSED');
    expect(established).toBe('ESTABLISHED');
  });
});

describe('TcpAction discriminant', () => {
  it.each([
    { type: 'SEND_SYN' as const },
    { type: 'SEND_SYN_ACK' as const },
    { type: 'SEND_ACK' as const },
    { type: 'SEND_FIN' as const },
    { type: 'SEND_RST' as const },
    { type: 'NONE' as const },
  ])('action $type has no extra fields', (action) => {
    const a: TcpAction = action;
    expect(a.type).toBe(action.type);
  });

  it('ERROR action carries reason', () => {
    const err: TcpAction = { type: 'ERROR', reason: 'unexpected state' };
    expect(err.type).toBe('ERROR');
    if (err.type === 'ERROR') {
      expect(err.reason).toBe('unexpected state');
    }
  });
});

describe('TcpConnection shape', () => {
  it('contains all required fields', () => {
    const conn: TcpConnection = {
      id: 'tcp-1',
      srcNodeId: 'client',
      dstNodeId: 'server',
      srcIp: '10.0.0.1',
      srcPort: 12345,
      dstIp: '10.0.0.2',
      dstPort: 80,
      state: 'SYN_SENT',
      localSeq: 1000,
      localAck: 0,
      remoteSeq: 0,
      createdAt: Date.now(),
    };
    expect(conn.state).toBe('SYN_SENT');
  });
});

describe('TcpTransitionResult shape', () => {
  it('pairs new state with action', () => {
    const result: TcpTransitionResult = {
      newState: 'ESTABLISHED',
      action: { type: 'SEND_ACK' },
    };
    expect(result.newState).toBe('ESTABLISHED');
    expect(result.action.type).toBe('SEND_ACK');
  });
});

describe('TcpFourTuple shape', () => {
  it('identifies a connection by src/dst ip:port', () => {
    const tuple: TcpFourTuple = {
      srcIp: '10.0.0.1',
      srcPort: 12345,
      dstIp: '10.0.0.2',
      dstPort: 80,
    };
    expect(tuple.srcPort).toBe(12345);
    expect(tuple.dstPort).toBe(80);
  });
});
