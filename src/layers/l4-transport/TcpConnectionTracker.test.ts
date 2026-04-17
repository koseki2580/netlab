import { describe, expect, it } from 'vitest';
import type { TcpConnection } from '../../types/tcp';
import { TcpConnectionTracker } from './TcpConnectionTracker';

function makeConnection(overrides: Partial<TcpConnection> = {}): TcpConnection {
  return {
    id: '10.0.0.10:12345-203.0.113.10:80',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    srcIp: '10.0.0.10',
    srcPort: 12345,
    dstIp: '203.0.113.10',
    dstPort: 80,
    state: 'ESTABLISHED',
    localSeq: 1001,
    localAck: 5001,
    remoteSeq: 5001,
    createdAt: 1,
    ...overrides,
  };
}

describe('TcpConnectionTracker', () => {
  it('addConnection stores the connection', () => {
    const tracker = new TcpConnectionTracker();
    const connection = makeConnection();

    tracker.addConnection(connection);

    expect(tracker.serialize()).toEqual([connection]);
  });

  it('getConnectionsForNode returns connections where node is src or dst', () => {
    const tracker = new TcpConnectionTracker();
    const connection = makeConnection();

    tracker.addConnection(connection);

    expect(tracker.getConnectionsForNode('client-1')).toEqual([connection]);
    expect(tracker.getConnectionsForNode('server-1')).toEqual([connection]);
  });

  it('findByFourTuple matches exact 4-tuple', () => {
    const tracker = new TcpConnectionTracker();
    const connection = makeConnection();
    tracker.addConnection(connection);

    expect(
      tracker.findByFourTuple({
        srcIp: '10.0.0.10',
        srcPort: 12345,
        dstIp: '203.0.113.10',
        dstPort: 80,
      }),
    ).toEqual(connection);
  });

  it('findByFourTuple matches reversed 4-tuple (remote side)', () => {
    const tracker = new TcpConnectionTracker();
    const connection = makeConnection();
    tracker.addConnection(connection);

    expect(
      tracker.findByFourTuple({
        srcIp: '203.0.113.10',
        srcPort: 80,
        dstIp: '10.0.0.10',
        dstPort: 12345,
      }),
    ).toEqual(connection);
  });

  it('updateState changes connection state', () => {
    const tracker = new TcpConnectionTracker();
    tracker.addConnection(makeConnection());

    tracker.updateState('10.0.0.10:12345-203.0.113.10:80', 'FIN_WAIT_1');

    expect(tracker.serialize()[0]?.state).toBe('FIN_WAIT_1');
  });

  it('removeConnection deletes the connection', () => {
    const tracker = new TcpConnectionTracker();
    tracker.addConnection(makeConnection());

    tracker.removeConnection('10.0.0.10:12345-203.0.113.10:80');

    expect(tracker.serialize()).toEqual([]);
  });

  it('clear removes all connections', () => {
    const tracker = new TcpConnectionTracker();
    tracker.addConnection(makeConnection());

    tracker.clear();

    expect(tracker.serialize()).toEqual([]);
  });

  it('serialize returns all connections as array', () => {
    const tracker = new TcpConnectionTracker();
    const first = makeConnection();
    const second = makeConnection({
      id: '10.0.0.11:23456-203.0.113.11:443',
      srcNodeId: 'client-2',
      dstNodeId: 'server-2',
      srcIp: '10.0.0.11',
      srcPort: 23456,
      dstIp: '203.0.113.11',
      dstPort: 443,
      createdAt: 2,
    });
    tracker.addConnection(first);
    tracker.addConnection(second);

    expect(tracker.serialize()).toEqual([first, second]);
  });

  it('returns empty array when no connections exist', () => {
    const tracker = new TcpConnectionTracker();

    expect(tracker.getConnectionsForNode('client-1')).toEqual([]);
    expect(tracker.serialize()).toEqual([]);
    expect(
      tracker.findByFourTuple({
        srcIp: '10.0.0.10',
        srcPort: 12345,
        dstIp: '203.0.113.10',
        dstPort: 80,
      }),
    ).toBeNull();
  });
});
