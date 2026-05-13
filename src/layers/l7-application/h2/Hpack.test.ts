import { describe, expect, it } from 'vitest';
import { decodeHpack, encodeHpack } from './Hpack';

describe('HPACK static-literal subset', () => {
  it('uses the RFC static index for :method GET and round-trips literal headers', () => {
    const encoded = encodeHpack([
      [':method', 'GET'],
      [':path', '/demo'],
      ['x-netlab', 'h2'],
    ]);

    expect(encoded[0]).toBe(0x82);
    expect(decodeHpack(encoded)).toEqual([
      [':method', 'GET'],
      [':path', '/demo'],
      ['x-netlab', 'h2'],
    ]);
  });
});
