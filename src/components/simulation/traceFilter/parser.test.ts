import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../../types/simulation';
import { parseTraceFilter } from './parser';

const tcpHop: PacketHop = {
  step: 0,
  nodeId: 'client',
  nodeLabel: 'Client',
  srcIp: '10.0.0.10',
  dstIp: '203.0.113.10',
  srcMac: 'aa:bb:cc:00:00:01',
  dstMac: 'aa:bb:cc:00:00:02',
  ttl: 64,
  protocol: 'TCP',
  srcPort: 49152,
  dstPort: 80,
  event: 'create',
  timestamp: 1,
};

const arpHop: PacketHop = {
  step: 1,
  nodeId: 'router',
  nodeLabel: 'Router',
  srcIp: '10.0.0.1',
  dstIp: '10.0.0.10',
  ttl: 64,
  protocol: 'ARP',
  event: 'arp-reply',
  timestamp: 2,
  arpFrame: {
    layer: 'L2',
    srcMac: 'aa:bb:cc:00:00:03',
    dstMac: 'ff:ff:ff:ff:ff:ff',
    etherType: 0x0806,
    payload: {
      layer: 'ARP',
      hardwareType: 1,
      protocolType: 0x0800,
      operation: 'reply',
      senderMac: 'aa:bb:cc:00:00:03',
      senderIp: '10.0.0.1',
      targetMac: 'aa:bb:cc:00:00:01',
      targetIp: '10.0.0.10',
    },
  },
};

const trace: PacketTrace = {
  packetId: 'trace-1',
  srcNodeId: 'client',
  dstNodeId: 'server',
  status: 'delivered',
  hops: [tcpHop, arpHop],
};

function expectPredicate(input: string) {
  const result = parseTraceFilter(input);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.predicate;
}

describe('trace display filter parser', () => {
  it('matches supported IP, protocol, and port fields', () => {
    expect(expectPredicate('ip.addr == 10.0.0.10')(tcpHop)).toBe(true);
    expect(expectPredicate('ip.dst == 203.0.113.10 && tcp.port == 80')(tcpHop)).toBe(true);
    expect(expectPredicate('protocol == arp')(arpHop)).toBe(true);
    expect(expectPredicate('eth.addr == aa:bb:cc:00:00:03')(arpHop)).toBe(true);
  });

  it('applies && before ||', () => {
    const predicate = expectPredicate('protocol == arp || protocol == tcp && tcp.port == 443');

    expect(predicate(arpHop)).toBe(true);
    expect(predicate(tcpHop)).toBe(false);
  });

  it('matches traces when any hop matches', () => {
    expect(expectPredicate('tcp.port == 80')(trace)).toBe(true);
    expect(expectPredicate('udp.port == 53')(trace)).toBe(false);
  });

  it('returns a NetlabError parse error with a column for unknown fields', () => {
    const result = parseTraceFilter('foo == 1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('trace-filter/parse');
    expect(result.error.context).toMatchObject({ column: 0 });
  });

  it('treats blank filters as an identity predicate', () => {
    expect(expectPredicate('   ')(tcpHop)).toBe(true);
  });
});
