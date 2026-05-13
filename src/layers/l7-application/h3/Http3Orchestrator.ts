export interface Http3StreamSummary {
  readonly id: bigint;
  readonly path: string;
  readonly status: 'complete' | 'stalled';
}

export interface Http3Run {
  readonly selectedAlpn: 'h3';
  readonly streams: readonly Http3StreamSummary[];
  readonly annotations: readonly string[];
}

export class Http3Orchestrator {
  runRequests(paths: readonly string[], opts: { readonly lostStreamId?: bigint } = {}): Http3Run {
    const streams = paths.map((path, index) => {
      const id = BigInt(index) * 4n;
      return {
        id,
        path,
        status: opts.lostStreamId === id ? 'stalled' : 'complete',
      } satisfies Http3StreamSummary;
    });
    return {
      selectedAlpn: 'h3',
      streams,
      annotations: [
        'h3:frame(SETTINGS)',
        ...streams.flatMap((stream) => [
          `h3:frame(HEADERS:${stream.id})`,
          `h3:frame(DATA:${stream.id})`,
        ]),
      ],
    };
  }
}
