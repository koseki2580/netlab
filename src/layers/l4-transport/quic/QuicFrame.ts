import { decodeQuicVarint, encodeQuicVarint } from './QuicVarint';

export type QuicFrame =
  | { readonly kind: 'CRYPTO'; readonly offset: bigint; readonly data: Uint8Array }
  | {
      readonly kind: 'STREAM';
      readonly streamId: bigint;
      readonly offset: bigint;
      readonly fin: boolean;
      readonly data: Uint8Array;
    }
  | {
      readonly kind: 'ACK';
      readonly largestAcked: bigint;
      readonly ackDelay: bigint;
      readonly firstAckRange: bigint;
    }
  | { readonly kind: 'PATH_CHALLENGE'; readonly data: Uint8Array }
  | { readonly kind: 'PATH_RESPONSE'; readonly data: Uint8Array };

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function serializeQuicFrame(frame: QuicFrame): Uint8Array {
  switch (frame.kind) {
    case 'CRYPTO':
      return concat([
        Uint8Array.from([0x06]),
        encodeQuicVarint(frame.offset),
        encodeQuicVarint(BigInt(frame.data.length)),
        frame.data,
      ]);
    case 'STREAM':
      return concat([
        Uint8Array.from([0x0e | (frame.fin ? 0x01 : 0)]),
        encodeQuicVarint(frame.streamId),
        encodeQuicVarint(frame.offset),
        encodeQuicVarint(BigInt(frame.data.length)),
        frame.data,
      ]);
    case 'ACK':
      return concat([
        Uint8Array.from([0x02]),
        encodeQuicVarint(frame.largestAcked),
        encodeQuicVarint(frame.ackDelay),
        encodeQuicVarint(0n),
        encodeQuicVarint(frame.firstAckRange),
      ]);
    case 'PATH_CHALLENGE':
      return concat([Uint8Array.from([0x1a]), frame.data]);
    case 'PATH_RESPONSE':
      return concat([Uint8Array.from([0x1b]), frame.data]);
  }
}

export function parseQuicFrame(bytes: Uint8Array): QuicFrame {
  const type = bytes[0] ?? 0;
  let offset = 1;
  if (type === 0x06) {
    const frameOffset = decodeQuicVarint(bytes, offset);
    offset += frameOffset.consumed;
    const length = decodeQuicVarint(bytes, offset);
    offset += length.consumed;
    return {
      kind: 'CRYPTO',
      offset: frameOffset.value,
      data: bytes.slice(offset, offset + Number(length.value)),
    };
  }
  if ((type & 0xf8) === 0x08) {
    const streamId = decodeQuicVarint(bytes, offset);
    offset += streamId.consumed;
    const streamOffset = decodeQuicVarint(bytes, offset);
    offset += streamOffset.consumed;
    const length = decodeQuicVarint(bytes, offset);
    offset += length.consumed;
    return {
      kind: 'STREAM',
      streamId: streamId.value,
      offset: streamOffset.value,
      fin: (type & 0x01) !== 0,
      data: bytes.slice(offset, offset + Number(length.value)),
    };
  }
  if (type === 0x02) {
    const largestAcked = decodeQuicVarint(bytes, offset);
    offset += largestAcked.consumed;
    const ackDelay = decodeQuicVarint(bytes, offset);
    offset += ackDelay.consumed;
    const rangeCount = decodeQuicVarint(bytes, offset);
    offset += rangeCount.consumed;
    const firstAckRange = decodeQuicVarint(bytes, offset);
    return {
      kind: 'ACK',
      largestAcked: largestAcked.value,
      ackDelay: ackDelay.value,
      firstAckRange: firstAckRange.value,
    };
  }
  if (type === 0x1a) return { kind: 'PATH_CHALLENGE', data: bytes.slice(1, 9) };
  if (type === 0x1b) return { kind: 'PATH_RESPONSE', data: bytes.slice(1, 9) };
  throw new RangeError(`Unsupported QUIC frame type ${type}`);
}
