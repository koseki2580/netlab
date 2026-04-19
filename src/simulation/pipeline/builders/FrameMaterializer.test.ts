import { describe, expect, it } from 'vitest';
import { makePacket } from '../../__fixtures__/helpers';
import { FrameMaterializer } from './FrameMaterializer';

describe('FrameMaterializer', () => {
  const materializer = new FrameMaterializer();

  it('withPacketIps updates srcIp and dstIp', () => {
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const updated = materializer.withPacketIps(packet, { srcIp: '192.168.1.1' });
    expect(updated.frame.payload.srcIp).toBe('192.168.1.1');
    expect(updated.frame.payload.dstIp).toBe('203.0.113.10');
  });

  it('withPacketIps returns same packet when IPs unchanged', () => {
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const same = materializer.withPacketIps(packet, {
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
    });
    expect(same).toBe(packet);
  });

  it('withPacketMacs sets srcMac and dstMac on hop', () => {
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    packet.frame.srcMac = 'aa:bb:cc:dd:ee:01';
    packet.frame.dstMac = 'aa:bb:cc:dd:ee:02';
    const hop = {
      nodeId: 'client-1',
      nodeLabel: 'Client',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      ttl: 64,
      protocol: 'TCP',
      event: 'forward' as const,
      timestamp: Date.now(),
    };
    const result = materializer.withPacketMacs(hop, packet);
    expect(result.srcMac).toBe('aa:bb:cc:dd:ee:01');
    expect(result.dstMac).toBe('aa:bb:cc:dd:ee:02');
  });

  it('withIpv4HeaderChecksum adds checksum', () => {
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const result = materializer.withIpv4HeaderChecksum(packet);
    expect(result.frame.payload.headerChecksum).toBeDefined();
    expect(typeof result.frame.payload.headerChecksum).toBe('number');
  });

  it('withFrameFcs adds FCS', () => {
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const result = materializer.withFrameFcs(packet);
    expect(result.frame.fcs).toBeDefined();
    expect(typeof result.frame.fcs).toBe('number');
  });

  it('diffPacketFields detects changed IP', () => {
    const before = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const after = {
      ...before,
      frame: {
        ...before.frame,
        payload: {
          ...before.frame.payload,
          srcIp: '192.168.1.100',
        },
      },
    };
    const diff = materializer.diffPacketFields(before, after);
    expect(diff.length).toBeGreaterThan(0);
    expect(diff).toContain('Src IP');
  });

  it('diffPacketFields returns empty for identical packets', () => {
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const diff = materializer.diffPacketFields(packet, packet);
    expect(diff).toHaveLength(0);
  });

  it('derivePacketIdentification returns a consistent number', () => {
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const id1 = materializer.derivePacketIdentification(packet);
    const id2 = materializer.derivePacketIdentification(packet);
    expect(typeof id1).toBe('number');
    expect(id1).toBe(id2);
  });
});
