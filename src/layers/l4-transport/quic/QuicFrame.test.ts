import { describe, expect, it } from 'vitest';
import { parseQuicFrame, serializeQuicFrame } from './QuicFrame';

describe('QUIC frames', () => {
  it('round-trips CRYPTO, STREAM, ACK, PATH_CHALLENGE, and PATH_RESPONSE frames', () => {
    const frames = [
      { kind: 'CRYPTO' as const, offset: 0n, data: new Uint8Array([1, 2, 3]) },
      {
        kind: 'STREAM' as const,
        streamId: 0n,
        offset: 4n,
        fin: true,
        data: new Uint8Array([4, 5]),
      },
      { kind: 'ACK' as const, largestAcked: 12n, ackDelay: 0n, firstAckRange: 3n },
      { kind: 'PATH_CHALLENGE' as const, data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
      { kind: 'PATH_RESPONSE' as const, data: new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]) },
    ];

    for (const frame of frames) {
      expect(parseQuicFrame(serializeQuicFrame(frame))).toEqual(frame);
    }
  });
});
