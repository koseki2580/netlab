import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../types/simulation';
import { historyRows, hopEdgeId, summarizeTraces } from './simulationSummary';

function hop(step: number, over?: string): PacketHop {
  return {
    step,
    nodeId: `n${step}`,
    nodeLabel: `N${step}`,
    srcIp: '10.0.0.1',
    dstIp: '10.0.1.1',
    ttl: 64 - step,
    protocol: 'ICMP',
    event: step === 0 ? 'create' : 'forward',
    ...(over ? { activeEdgeId: over } : {}),
  } as PacketHop;
}

function trace(id: string, status: PacketTrace['status'], hops: PacketHop[]): PacketTrace {
  return { packetId: id, srcNodeId: 'a', dstNodeId: 'b', hops, status };
}

describe('simulation summary', () => {
  it('counts by trace, not by hop', () => {
    // One packet that crossed four routers is still one delivery.
    const summary = summarizeTraces([
      trace('p1', 'delivered', [hop(0), hop(1, 'e1'), hop(2, 'e2'), hop(3, 'e3')]),
      trace('p2', 'dropped', [hop(0), hop(1, 'e1')]),
      trace('p3', 'in-flight', [hop(0)]),
    ]);
    expect(summary).toEqual({
      total: 3,
      delivered: 1,
      dropped: 1,
      inFlight: 1,
      longestPath: 4,
    });
  });

  it('measures the longest path over delivered traces only', () => {
    // A packet that died after eight hops did not travel further "successfully";
    // reporting it as the longest path would tell the learner the wrong story.
    const summary = summarizeTraces([
      trace('ok', 'delivered', [hop(0), hop(1, 'e1')]),
      trace('lost', 'dropped', [hop(0), hop(1, 'e1'), hop(2, 'e2'), hop(3, 'e3')]),
    ]);
    expect(summary.longestPath).toBe(2);
  });

  it('reports an empty run without dividing by anything', () => {
    expect(summarizeTraces([])).toEqual({
      total: 0,
      delivered: 0,
      dropped: 0,
      inFlight: 0,
      longestPath: 0,
    });
  });

  it('maps a hop to the link it crossed, and to nothing when it crossed none', () => {
    expect(hopEdgeId(hop(1, 'e7'))).toBe('e7');
    // Step 0 is the packet being created at its source — no link involved.
    expect(hopEdgeId(hop(0))).toBeNull();
  });

  it('flattens hops into one chronological list that keeps its trace', () => {
    const t1 = trace('p1', 'delivered', [hop(0), hop(1, 'e1')]);
    const t2 = trace('p2', 'dropped', [hop(0)]);
    const rows = historyRows([t1, t2]);
    expect(rows.map((row) => `${row.trace.packetId}:${row.hop.step}`)).toEqual([
      'p1:0',
      'p1:1',
      'p2:0',
    ]);
  });
});
