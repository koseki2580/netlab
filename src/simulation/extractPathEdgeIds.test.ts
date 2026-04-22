import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../types/simulation';
import { extractPathEdgeIds } from './extractPathEdgeIds';

function makeHop(overrides: Partial<PacketHop> = {}): PacketHop {
  return {
    step: 0,
    nodeId: 'n1',
    nodeLabel: 'N1',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 'TCP',
    event: 'forward',
    timestamp: 1,
    ...overrides,
  };
}

describe('extractPathEdgeIds', () => {
  it('collects unique activeEdgeId values from hops in traversal order', () => {
    const trace: PacketTrace = {
      packetId: 'p1',
      srcNodeId: 'n1',
      dstNodeId: 'n4',
      status: 'delivered',
      hops: [
        makeHop({ event: 'create' }),
        makeHop({ step: 1, activeEdgeId: 'e1' }),
        makeHop({ step: 2, activeEdgeId: 'e2' }),
        makeHop({ step: 3, activeEdgeId: 'e1' }),
        makeHop({ step: 4, event: 'deliver' }),
      ],
    };

    expect(extractPathEdgeIds(trace)).toEqual(['e1', 'e2']);
  });

  it('returns an empty array when the trace never traverses an edge', () => {
    const trace: PacketTrace = {
      packetId: 'p2',
      srcNodeId: 'n1',
      dstNodeId: 'n2',
      status: 'dropped',
      hops: [makeHop({ event: 'create' }), makeHop({ step: 1, event: 'drop' })],
    };

    expect(extractPathEdgeIds(trace)).toEqual([]);
  });
});
