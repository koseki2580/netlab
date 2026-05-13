import { describe, expect, it } from 'vitest';
import { HTTP2_FLAGS, HTTP2_FRAME_TYPE } from './Http2FrameTypes';
import { parseHttp2Frame, serializeHttp2Frame } from './Http2Frame';

const encoder = new TextEncoder();

describe('HTTP/2 frames', () => {
  it('round-trips DATA, HEADERS, SETTINGS, PING, WINDOW_UPDATE, and GOAWAY frames', () => {
    const frames = [
      {
        kind: 'DATA' as const,
        streamId: 1,
        flags: HTTP2_FLAGS.END_STREAM,
        data: encoder.encode('hello'),
      },
      {
        kind: 'HEADERS' as const,
        streamId: 1,
        flags: HTTP2_FLAGS.END_HEADERS,
        headerBlock: encoder.encode(':path:/'),
      },
      { kind: 'SETTINGS' as const, flags: 0, settings: [{ id: 0x4, value: 65535 }] },
      { kind: 'PING' as const, flags: 0, opaqueData: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
      { kind: 'WINDOW_UPDATE' as const, streamId: 1, increment: 1024 },
      { kind: 'GOAWAY' as const, lastStreamId: 3, errorCode: 0, debugData: encoder.encode('bye') },
    ];

    for (const frame of frames) {
      expect(parseHttp2Frame(serializeHttp2Frame(frame))).toEqual(frame);
    }
  });

  it('encodes the 9-byte HTTP/2 frame header', () => {
    const bytes = serializeHttp2Frame({
      kind: 'DATA',
      streamId: 7,
      flags: 0,
      data: encoder.encode('abc'),
    });

    expect([...bytes.slice(0, 9)]).toEqual([0, 0, 3, HTTP2_FRAME_TYPE.DATA, 0, 0, 0, 0, 7]);
  });
});
