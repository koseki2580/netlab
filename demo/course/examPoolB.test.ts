import { describe, expect, it } from 'vitest';
import { bestRoute } from '../../src/layers/l3-network/logicalInterfaces';
import {
  negotiateTcpOptions,
  synAckOptions,
  synOptions,
} from '../../src/layers/l4-transport/TcpFlowControl';
import type { RouteEntry } from '../../src/types/routing';
import { isInSubnet, subnetFacts } from '../../src/utils/cidr';
import { POOL_B } from './examPoolB';

const right = (id: string) => {
  const q = [...POOL_B.values()].flat().find((entry) => entry.id === id)!;
  return q.options[q.answer]!.en;
};
const row = (destination: string, nextHop: string): RouteEntry => ({
  destination,
  nextHop,
  metric: 0,
  protocol: 'static',
  adminDistance: 1,
  nodeId: 'r',
});
/** IPv4 fragments of `dataBytes` over a link of `mtu`, 20-byte header (RFC 791). */
const fragments = (dataBytes: number, mtu: number) =>
  Math.ceil(dataBytes / (Math.floor((mtu - 20) / 8) * 8));
/** RFC 5681: ssthresh after a loss. */
const ssthresh = (inFlight: number, mss: number) => Math.max(inFlight / 2, 2 * mss);

// TC-1359: wave B answers that are arithmetic or engine facts come from the code or the formula.
describe('the wave B answers are what the code or the RFC formula gives (TC-1359)', () => {
  it('addresses and routes', () => {
    expect(isInSubnet('10.200.1.1', '10.0.0.0/8')).toBe(true);
    expect(right('s1-same-8')).toBe('10.200.1.1');
    expect(isInSubnet('172.16.8.250', '172.16.8.0/24')).toBe(true);
    expect(right('same-network-c')).toBe('172.16.8.250');
    expect(subnetFacts('172.16.4.0', 24).broadcastAddress).toBe(right('s1-broadcast-address'));
    expect(right('s1-pcs-with-router')).toBe(
      `${subnetFacts('10.0.0.0', 24).usableHostCount - 1} PCs`,
    );
    expect(
      bestRoute('192.0.2.1', [
        row('10.0.0.0/8', 'A'),
        row('10.1.0.0/16', 'B'),
        row('0.0.0.0/0', 'D'),
      ])?.nextHop,
    ).toBe('D');
    expect(right('s3-lpm-default-only')).toMatch(/^D,/);
    // TC-1368: only the address a row fits is forwarded; the other has no route.
    const only = [row('10.0.0.0/8', 'A')];
    expect(bestRoute('10.200.0.1', only)?.nextHop).toBe('A');
    expect(bestRoute('11.0.0.1', only)).toBeNull();
    expect(right('s3-no-route-which')).toBe('Only 10.200.0.1');
    expect(
      bestRoute('203.0.113.9', [
        row('0.0.0.0/0', '172.16.0.2'),
        row('203.0.113.0/24', '172.16.0.6'),
      ])?.nextHop,
    ).toBe(right('s3-specific-beats-default'));
  });

  it('TTL, OSPF metrics and the MSS', () => {
    expect(right('s3-ttl-at-server')).toBe(String(64 - 3));
    expect(right('l4-ospf-metric-sum')).toBe(String(1 + 1 + 1));
    expect(right('l3-ospf-new-metric')).toBe(String(2 + 2 + 1));
    expect(right('l2-ospf-cost-pick')).toMatch(/total cost 3/);
    const syn = synOptions({ mss: 1460 });
    const { clientSendMss } = negotiateTcpOptions(syn, synAckOptions({ mss: 1460 }, syn));
    expect(right('tcp-mss-both-same')).toBe(`${clientSendMss} bytes`);
  });

  it('fragments and their offsets', () => {
    expect(right('l2-mtu-fragments')).toBe(`${fragments(1208, 604)} fragments`);
    expect(right('s3-two-fragments')).toBe(`${fragments(1480, 1000)} fragments`);
    expect(right('l4-mtu-fragment-offset')).toBe(String(584 / 8));
  });

  it('congestion control', () => {
    expect(right('l4-fast-recovery-ssthresh')).toBe(`${ssthresh(8000, 1000)} bytes`);
    expect(right('l4-fast-recovery-cwnd')).toBe(`${ssthresh(8000, 1000) + 3 * 1000} bytes`);
    expect(right('l8-rto-ssthresh-big')).toBe(`${ssthresh(10_000, 1000)} bytes`);
    expect(right('l8-rto-ssthresh-floor')).toBe(`${ssthresh(1000, 1000)} bytes`);
  });

  it('stream IDs, timing and the VRRP MAC', () => {
    expect(right('l8-h2-fifth-request')).toBe(String(7 + 2));
    expect(right('l8-h3-fifth')).toBe(String(12 + 4));
    // RFC 9000 §2.1: 3 = 0b11, server-initiated (bit 0) and unidirectional (bit 1).
    expect(3 & 1).toBe(1);
    expect(3 & 2).toBe(2);
    expect(right('l8-h3-low-bits')).toBe('Server, one way');
    expect(right('l4-qos-serialization')).toBe(`${((1500 * 8) / 1_000_000) * 1000} ms`);
    expect(right('l4-qos-crossing')).toBe(`${2 + 10} ms`);
    expect(right('l3-vrrp-virtual-mac')).toBe(
      `00:00:5e:00:01:${(10).toString(16).padStart(2, '0')}`,
    );
  });
});
