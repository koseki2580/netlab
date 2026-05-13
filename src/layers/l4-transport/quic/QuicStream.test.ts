import { describe, expect, it } from 'vitest';
import { reassembleQuicStream, streamDirection, streamInitiator } from './QuicStream';

describe('QUIC stream helpers', () => {
  it('decodes initiator/direction bits and reassembles by offset', () => {
    expect(streamInitiator(0n)).toBe('client');
    expect(streamDirection(2n)).toBe('uni');

    expect(
      new TextDecoder().decode(
        reassembleQuicStream([
          { offset: 6, data: new TextEncoder().encode('world'), fin: true },
          { offset: 0, data: new TextEncoder().encode('hello '), fin: false },
        ]),
      ),
    ).toBe('hello world');
  });
});
