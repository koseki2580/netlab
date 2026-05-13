import { describe, expect, it } from 'vitest';
import { parseHttp3Frame, serializeHttp3Frame } from './Http3Frame';

describe('HTTP/3 frames', () => {
  it('round-trips DATA, HEADERS, and SETTINGS frames', () => {
    const frames = [
      { kind: 'DATA' as const, data: new Uint8Array([1, 2]) },
      { kind: 'HEADERS' as const, headerBlock: new Uint8Array([0x11]) },
      { kind: 'SETTINGS' as const, settings: [{ id: 1n, value: 4096n }] },
    ];

    for (const frame of frames) {
      expect(parseHttp3Frame(serializeHttp3Frame(frame))).toEqual(frame);
    }
  });
});
