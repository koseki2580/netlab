import { describe, expect, it } from 'vitest';
import { Http2Orchestrator } from './Http2Orchestrator';

describe('Http2Orchestrator', () => {
  it('interleaves DATA frames for concurrent streams and shows transport HOL on loss', () => {
    const run = new Http2Orchestrator().runMultiplexedRequests(['/a', '/b', '/c', '/d'], {
      transportLoss: true,
    });

    expect(run.selectedAlpn).toBe('h2');
    expect(run.streams).toHaveLength(4);
    expect(
      run.frames.filter((frame) => frame.kind === 'DATA').map((frame) => frame.streamId),
    ).toEqual([1, 3, 5, 7, 1, 3, 5, 7]);
    expect(run.streams.every((stream) => stream.status === 'stalled')).toBe(true);
  });
});
