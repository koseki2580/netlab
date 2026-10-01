import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import { buildOspfConvergenceTopology } from '../../src/scenarios/ospf-convergence';
import { probePath } from './OspfConvergenceDemo';
import { ospfLinkCosts } from './OspfLinkCosts';

function hop(step: number, nodeLabel: string, event: PacketHop['event']): PacketHop {
  return {
    step,
    nodeId: nodeLabel.toLowerCase(),
    nodeLabel,
    srcIp: '10.1.0.10',
    dstIp: '10.4.0.10',
    ttl: 64,
    protocol: 'ICMP',
    event,
    timestamp: step,
  };
}

function trace(hops: PacketHop[]): PacketTrace {
  return { packetId: 'p', srcNodeId: 'c1', dstNodeId: 'c2', hops, status: 'delivered' };
}

describe('the OSPF lesson names the route a probe took', () => {
  it('reads the request leg by device, leaving out ARP and the reply', () => {
    const path = probePath(
      trace([
        hop(0, 'C1', 'create'),
        hop(1, 'R1', 'forward'),
        hop(2, 'R2', 'forward'),
        hop(3, 'R4', 'arp-request'),
        hop(4, 'C2', 'arp-reply'),
        hop(5, 'R4', 'forward'),
        hop(6, 'C2', 'deliver'),
        hop(7, 'C2', 'create'),
        hop(8, 'R4', 'forward'),
      ]),
    );
    expect(path).toBe('C1 → R1 → R2 → R4 → C2');
  });

  it('ends at the device that dropped it', () => {
    expect(
      probePath(trace([hop(0, 'C1', 'create'), hop(1, 'R1', 'drop'), hop(2, 'R2', 'forward')])),
    ).toBe('C1 → R1');
  });
});

// TC-253: the lesson lists each inter-router link's OSPF cost, per direction.
describe('the OSPF lesson lists its link costs', () => {
  it('reads each end of every inter-router link, and leaves host links out', () => {
    expect(ospfLinkCosts(buildOspfConvergenceTopology(false))).toEqual([
      { id: 'e-r1-r2', from: 'R1', to: 'R2', forward: 1, reverse: 1, down: false },
      { id: 'e-r1-r3', from: 'R1', to: 'R3', forward: 3, reverse: 1, down: false },
      { id: 'e-r2-r4', from: 'R2', to: 'R4', forward: 1, reverse: 1, down: false },
      { id: 'e-r3-r4', from: 'R3', to: 'R4', forward: 1, reverse: 1, down: false },
    ]);
  });

  it('marks the failed link down', () => {
    const failed = ospfLinkCosts(buildOspfConvergenceTopology(true));
    expect(failed.find((link) => link.id === 'e-r2-r4')?.down).toBe(true);
    expect(failed.filter((link) => link.down)).toHaveLength(1);
  });
});
