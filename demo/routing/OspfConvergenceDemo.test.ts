import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import { probePath } from './OspfConvergenceDemo';

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
