import { HTTP2_FLAGS, type Http2Frame } from './Http2FrameTypes';
import { encodeHpack } from './Hpack';

export interface Http2StreamSummary {
  readonly id: number;
  readonly path: string;
  readonly status: 'complete' | 'stalled';
}

export interface Http2Run {
  readonly selectedAlpn: 'h2';
  readonly streams: readonly Http2StreamSummary[];
  readonly frames: readonly Http2Frame[];
  readonly annotations: readonly string[];
}

export class Http2Orchestrator {
  runMultiplexedRequests(
    paths: readonly string[],
    opts: { readonly transportLoss?: boolean } = {},
  ): Http2Run {
    const streams = paths.map((path, index) => ({
      id: 1 + index * 2,
      path,
      status: opts.transportLoss ? 'stalled' : 'complete',
    })) satisfies Http2StreamSummary[];
    const frames: Http2Frame[] = [
      { kind: 'SETTINGS', flags: 0, settings: [{ id: 0x4, value: 65535 }] },
      ...streams.map((stream) => ({
        kind: 'HEADERS' as const,
        streamId: stream.id,
        flags: HTTP2_FLAGS.END_HEADERS,
        headerBlock: encodeHpack([
          [':method', 'GET'],
          [':path', stream.path],
        ]),
      })),
    ];

    for (let chunk = 0; chunk < 2; chunk += 1) {
      for (const stream of streams) {
        frames.push({
          kind: 'DATA',
          streamId: stream.id,
          flags: chunk === 1 ? HTTP2_FLAGS.END_STREAM : 0,
          data: new TextEncoder().encode(`${stream.path}:${chunk}`),
        });
      }
    }

    return {
      selectedAlpn: 'h2',
      streams,
      frames,
      annotations: frames.map((frame) => `h2:frame(${frame.kind})`),
    };
  }
}
