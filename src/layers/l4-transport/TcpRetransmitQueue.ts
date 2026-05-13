import { NetlabError } from '../../errors';

export interface TcpRetransmitSegment {
  readonly seq: number;
  readonly bytes: number;
  readonly sentAtStep: number;
}

export interface TcpAckResult {
  readonly bytesAcked: number;
  readonly oldestSeq: number | null;
}

export class TcpRetransmitQueue {
  private segments: TcpRetransmitSegment[] = [];

  enqueue(seq: number, bytes: number, sentAtStep: number): void {
    this.segments = [...this.segments, { seq, bytes, sentAtStep }].sort((a, b) => a.seq - b.seq);
  }

  ackUpTo(ackNo: number): TcpAckResult {
    this.assertNotPartialAck(ackNo);

    let bytesAcked = 0;
    const remaining: TcpRetransmitSegment[] = [];

    for (const segment of this.segments) {
      if (segment.seq + segment.bytes <= ackNo) {
        bytesAcked += segment.bytes;
      } else {
        remaining.push(segment);
      }
    }

    this.segments = remaining;

    return {
      bytesAcked,
      oldestSeq: this.segments[0]?.seq ?? null,
    };
  }

  peekOldest(): TcpRetransmitSegment | null {
    const oldest = this.segments[0];
    return oldest ? { ...oldest } : null;
  }

  markRetransmitted(seq: number, atStep: number): void {
    this.segments = this.segments.map((segment) =>
      segment.seq === seq ? { ...segment, sentAtStep: atStep } : segment,
    );
  }

  size(): number {
    return this.segments.length;
  }

  private assertNotPartialAck(ackNo: number): void {
    const partialSegment = this.segments.find(
      (segment) => ackNo > segment.seq && ackNo < segment.seq + segment.bytes,
    );

    if (!partialSegment) {
      return;
    }

    throw new NetlabError({
      code: 'tcp/partial-segment-ack',
      message: 'TCP cumulative ACK landed inside a retransmit queue segment',
      context: {
        ackNo,
        seq: partialSegment.seq,
        bytes: partialSegment.bytes,
      },
    });
  }
}
