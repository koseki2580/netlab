import { describe, expect, it } from 'vitest';
import type {
  HttpSessionPhase,
  NetworkSession,
  SessionEvent,
  SessionPhase,
  SessionStatus,
} from './session';

describe('SessionPhase values', () => {
  it('includes request and response phases', () => {
    const phases: SessionPhase[] = [
      'request:initiated',
      'request:routing',
      'request:delivered',
      'response:generated',
      'response:routing',
      'response:delivered',
      'drop',
    ];
    expect(phases).toHaveLength(7);
  });
});

describe('SessionStatus values', () => {
  it('has three terminal states', () => {
    const statuses: SessionStatus[] = ['pending', 'success', 'failed'];
    expect(statuses).toHaveLength(3);
  });
});

describe('HttpSessionPhase values', () => {
  it('covers 4-phase HTTP lifecycle', () => {
    const phases: HttpSessionPhase[] = ['tcp-open', 'http-request', 'http-response', 'tcp-close'];
    expect(phases).toHaveLength(4);
  });
});

describe('SessionEvent shape', () => {
  it('requires phase, timestamp, seq', () => {
    const evt: SessionEvent = {
      phase: 'request:initiated',
      timestamp: 1000,
      seq: 0,
    };
    expect(evt.phase).toBe('request:initiated');
    expect(evt.nodeId).toBeUndefined();
  });
});

describe('NetworkSession shape', () => {
  it('minimal session', () => {
    const session: NetworkSession = {
      sessionId: 's1',
      srcNodeId: 'client',
      dstNodeId: 'server',
      status: 'pending',
      createdAt: Date.now(),
      events: [],
    };
    expect(session.status).toBe('pending');
    expect(session.events).toHaveLength(0);
  });

  it('completed session with error', () => {
    const session: NetworkSession = {
      sessionId: 's2',
      srcNodeId: 'a',
      dstNodeId: 'b',
      status: 'failed',
      createdAt: 1000,
      completedAt: 2000,
      events: [{ phase: 'drop', timestamp: 1500, seq: 0, nodeId: 'router-1' }],
      error: { reason: 'TTL exceeded', nodeId: 'router-1' },
    };
    expect(session.error?.reason).toBe('TTL exceeded');
  });
});
