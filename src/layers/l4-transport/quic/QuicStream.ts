export interface QuicStreamChunk {
  readonly offset: number;
  readonly data: Uint8Array;
  readonly fin: boolean;
}

export function streamInitiator(streamId: bigint): 'client' | 'server' {
  return (streamId & 0x01n) === 0n ? 'client' : 'server';
}

export function streamDirection(streamId: bigint): 'bi' | 'uni' {
  return (streamId & 0x02n) === 0n ? 'bi' : 'uni';
}

export function reassembleQuicStream(chunks: readonly QuicStreamChunk[]): Uint8Array {
  const sorted = [...chunks].sort((left, right) => left.offset - right.offset);
  const size = sorted.reduce((max, chunk) => Math.max(max, chunk.offset + chunk.data.length), 0);
  const out = new Uint8Array(size);
  for (const chunk of sorted) {
    out.set(chunk.data, chunk.offset);
  }
  return out;
}
