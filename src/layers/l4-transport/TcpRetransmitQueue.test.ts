import { describe, expect, it } from 'vitest';
import { NetlabError } from '../../errors';
import { TcpRetransmitQueue } from './TcpRetransmitQueue';

describe('TcpRetransmitQueue', () => {
  it('starts empty', () => {
    const queue = new TcpRetransmitQueue();

    expect(queue.size()).toBe(0);
    expect(queue.peekOldest()).toBeNull();
  });

  it('enqueues segments and exposes the oldest segment', () => {
    const queue = new TcpRetransmitQueue();

    queue.enqueue(1000, 500, 1);
    queue.enqueue(1500, 500, 2);

    expect(queue.size()).toBe(2);
    expect(queue.peekOldest()).toEqual({ seq: 1000, bytes: 500, sentAtStep: 1 });
  });

  it('cumulative ACK clears multiple segments', () => {
    const queue = new TcpRetransmitQueue();
    queue.enqueue(1000, 500, 1);
    queue.enqueue(1500, 500, 2);

    const result = queue.ackUpTo(2000);

    expect(result).toEqual({ bytesAcked: 1000, oldestSeq: null });
    expect(queue.size()).toBe(0);
  });

  it('leaves later segments queued after a cumulative ACK', () => {
    const queue = new TcpRetransmitQueue();
    queue.enqueue(1000, 500, 1);
    queue.enqueue(1500, 500, 2);

    const result = queue.ackUpTo(1500);

    expect(result).toEqual({ bytesAcked: 500, oldestSeq: 1500 });
    expect(queue.peekOldest()).toEqual({ seq: 1500, bytes: 500, sentAtStep: 2 });
  });

  it('does not acknowledge segments below the oldest boundary', () => {
    const queue = new TcpRetransmitQueue();
    queue.enqueue(1000, 500, 1);

    const result = queue.ackUpTo(1000);

    expect(result).toEqual({ bytesAcked: 0, oldestSeq: 1000 });
    expect(queue.size()).toBe(1);
  });

  it('throws a NetlabError for partial ACKs inside a segment', () => {
    const queue = new TcpRetransmitQueue();
    queue.enqueue(1000, 500, 1);

    expect(() => queue.ackUpTo(1250)).toThrow(NetlabError);
    try {
      queue.ackUpTo(1250);
    } catch (error) {
      expect(NetlabError.isInstance(error)).toBe(true);
      if (NetlabError.isInstance(error)) {
        expect(error.code).toBe('tcp/partial-segment-ack');
      }
    }
  });

  it('updates sentAtStep when a segment is marked retransmitted', () => {
    const queue = new TcpRetransmitQueue();
    queue.enqueue(1000, 500, 1);

    queue.markRetransmitted(1000, 9);

    expect(queue.peekOldest()).toEqual({ seq: 1000, bytes: 500, sentAtStep: 9 });
  });

  it('does not duplicate a retransmitted segment entry', () => {
    const queue = new TcpRetransmitQueue();
    queue.enqueue(1000, 500, 1);

    queue.markRetransmitted(1000, 9);

    expect(queue.size()).toBe(1);
  });

  it('ignores retransmit marks for unknown segments', () => {
    const queue = new TcpRetransmitQueue();

    queue.markRetransmitted(1000, 9);

    expect(queue.size()).toBe(0);
  });

  it('defensively copies peeked segment state', () => {
    const queue = new TcpRetransmitQueue();
    queue.enqueue(1000, 500, 1);

    const oldest = queue.peekOldest();

    expect(oldest).toEqual({ seq: 1000, bytes: 500, sentAtStep: 1 });
    expect(queue.peekOldest()).toEqual({ seq: 1000, bytes: 500, sentAtStep: 1 });
  });
});
