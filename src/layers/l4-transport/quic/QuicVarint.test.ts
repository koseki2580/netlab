import { describe, expect, it } from 'vitest';
import { decodeQuicVarint, encodeQuicVarint } from './QuicVarint';

describe('QUIC varint', () => {
  it.each([0n, 63n, 64n, 15293n, 16383n, 16384n, 1073741823n, 1073741824n])(
    'round-trips %s',
    (value) => {
      const encoded = encodeQuicVarint(value);
      expect(decodeQuicVarint(encoded)).toEqual({ value, consumed: encoded.length });
    },
  );
});
