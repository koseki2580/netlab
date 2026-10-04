import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import { deriveNodeStates, shownHandshakeSegment } from './TcpHandshakeDemo';

// Each segment is recorded like the lesson's: create, two ARP hops, a router
// forward, then the delivery (hop index 4).
function segment(packetId: string, label: string, src: string, dst: string): PacketTrace {
  const events: PacketHop['event'][] = ['create', 'arp-request', 'arp-reply', 'forward', 'deliver'];
  return {
    packetId,
    label,
    srcNodeId: src,
    dstNodeId: dst,
    status: 'delivered',
    hops: events.map(
      (event, step) =>
        ({
          step,
          event,
          nodeId: step === 4 ? dst : src,
          nodeLabel: '',
          srcIp: '',
          dstIp: '',
          ttl: 64,
          protocol: 'TCP',
          timestamp: step,
        }) as PacketHop,
    ),
  };
}

const HANDSHAKE = [
  segment('syn', 'TCP SYN', 'client-1', 'server-1'),
  segment('synack', 'TCP SYN-ACK', 'server-1', 'client-1'),
  segment('ack', 'TCP ACK', 'client-1', 'server-1'),
];

const at = (traceId: string, step: number, status: 'paused' | 'done' = 'paused') =>
  deriveNodeStates(HANDSHAKE, traceId, step, status, true);

describe('TC-LESSON-TCP-STATES: the TCP states follow the step the learner is on', () => {
  it('before any step: CLOSED and LISTEN, even though the engine already holds the connection', () => {
    expect(at('syn', -1)).toEqual({ client: 'CLOSED', server: 'LISTEN' });
  });

  it('while the SYN is on its ARP hops, only the client has changed', () => {
    expect(at('syn', 2)).toEqual({ client: 'SYN_SENT', server: 'LISTEN' });
  });

  it('once the SYN is delivered, the server is SYN_RECEIVED', () => {
    expect(at('syn', 4)).toEqual({ client: 'SYN_SENT', server: 'SYN_RECEIVED' });
  });

  it('the client is ESTABLISHED only when the SYN-ACK reaches it', () => {
    expect(at('synack', 3)).toEqual({ client: 'SYN_SENT', server: 'SYN_RECEIVED' });
    expect(at('synack', 4)).toEqual({ client: 'ESTABLISHED', server: 'SYN_RECEIVED' });
  });

  it('both are ESTABLISHED after the final ACK is delivered, and when the trace has played through', () => {
    expect(at('ack', 3)).toEqual({ client: 'ESTABLISHED', server: 'SYN_RECEIVED' });
    expect(at('ack', 4)).toEqual({ client: 'ESTABLISHED', server: 'ESTABLISHED' });
    expect(at('ack', 4, 'done')).toEqual({ client: 'ESTABLISHED', server: 'ESTABLISHED' });
  });

  it('a teardown starts from an open connection', () => {
    const fin = [segment('fin', 'TCP FIN', 'client-1', 'server-1')];
    expect(deriveNodeStates(fin, 'fin', -1, 'paused', true)).toEqual({
      client: 'ESTABLISHED',
      server: 'ESTABLISHED',
    });
    expect(deriveNodeStates(fin, 'fin', 4, 'done', true)).toEqual({
      client: 'FIN_WAIT_1',
      server: 'CLOSE_WAIT',
    });
  });
});

describe('TC-356: the diagram says the telephone phrase of the segment being shown', () => {
  it('says nothing before the first step', () => {
    expect(shownHandshakeSegment(HANDSHAKE, 'syn', -1, 'paused')).toBeNull();
    expect(shownHandshakeSegment([], null, -1, 'idle')).toBeNull();
  });

  it('names SYN, SYN-ACK and ACK as each is stepped into or played through', () => {
    expect(shownHandshakeSegment(HANDSHAKE, 'syn', 0, 'paused')).toBe('syn');
    expect(shownHandshakeSegment(HANDSHAKE, 'synack', 2, 'running')).toBe('syn-ack');
    expect(shownHandshakeSegment(HANDSHAKE, 'ack', 4, 'done')).toBe('ack');
  });

  it('does not call a teardown ACK "let us talk"', () => {
    const teardown = [
      segment('fin', 'TCP FIN', 'client-1', 'server-1'),
      segment('finack', 'TCP ACK', 'server-1', 'client-1'),
    ];
    expect(shownHandshakeSegment(teardown, 'finack', 4, 'done')).toBeNull();
  });
});
