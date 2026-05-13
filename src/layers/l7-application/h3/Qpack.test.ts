import { describe, expect, it } from 'vitest';
import { decodeQpack, encodeQpack } from './Qpack';

describe('QPACK static subset', () => {
  it('uses the static entry for :method GET and round-trips literals', () => {
    const encoded = encodeQpack([
      [':method', 'GET'],
      [':path', '/'],
      ['x-netlab', 'h3'],
    ]);

    expect(encoded[0]).toBe(0x11);
    expect(decodeQpack(encoded)).toEqual([
      [':method', 'GET'],
      [':path', '/'],
      ['x-netlab', 'h3'],
    ]);
  });
});
