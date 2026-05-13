import { describe, expect, it } from 'vitest';
import { Http3Orchestrator } from './Http3Orchestrator';

describe('Http3Orchestrator', () => {
  it('keeps unaffected QUIC streams progressing when one stream is lost', () => {
    const run = new Http3Orchestrator().runRequests(['/a', '/b', '/c', '/d'], { lostStreamId: 4n });

    expect(run.selectedAlpn).toBe('h3');
    expect(run.streams.filter((stream) => stream.status === 'stalled')).toEqual([
      expect.objectContaining({ id: 4n }),
    ]);
    expect(run.streams.filter((stream) => stream.status === 'complete')).toHaveLength(3);
  });
});
