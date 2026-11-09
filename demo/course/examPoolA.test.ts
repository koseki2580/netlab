import { describe, expect, it } from 'vitest';
import { bestRoute } from '../../src/layers/l3-network/logicalInterfaces';
import {
  negotiateTcpOptions,
  synAckOptions,
  synOptions,
} from '../../src/layers/l4-transport/TcpFlowControl';
import type { RouteEntry } from '../../src/types/routing';
import { isInSubnet, maskInt, reservedAddressKind, subnetFacts } from '../../src/utils/cidr';
import { POOL_A } from './examPoolA';

const right = (id: string) => {
  const q = [...POOL_A.values()].find((entry) => entry.id === id)!;
  return q.options[q.answer]!.en;
};

// TC-1355: the answers that are arithmetic or engine facts come from the code that teaches them.
describe('the new answers are what the code gives (TC-1355)', () => {
  it('the same /24 network', () => {
    expect(right('s1-same-24')).toBe('192.168.5.200');
    for (const option of ['192.168.6.205', '192.169.5.20', '10.192.168.5', '192.168.5.200']) {
      expect(isInSubnet(option, '192.168.5.0/24'), option).toBe(option === '192.168.5.200');
    }
    expect(right('same-network-b')).toBe('10.20.30.4');
    expect(isInSubnet('10.20.30.4', '10.20.30.0/24')).toBe(true);
  });

  it('the address a machine may take, and the room left in a /24', () => {
    expect(reservedAddressKind('10.0.5.0', 24)).toBe('network');
    expect(reservedAddressKind('10.0.5.255', 24)).toBe('broadcast');
    expect(reservedAddressKind('10.0.5.1', 24)).toBeNull();
    expect(right('s1-usable-pick')).toBe('10.0.5.1');
    const facts = subnetFacts('192.168.10.0', 24);
    // 250 PCs and the router already use 251 of the usable addresses.
    expect(right('s1-host-room')).toBe(`${facts.usableHostCount - 251} more`);
    expect(maskInt(24) >>> 0).toBe(0xffffff00);
  });

  it('the longest match of four rows', () => {
    const row = (destination: string, nextHop: string): RouteEntry => ({
      destination,
      nextHop,
      metric: 0,
      protocol: 'static',
      adminDistance: 1,
      nodeId: 'r',
    });
    const rows = [
      row('0.0.0.0/0', 'D'),
      row('172.16.0.0/12', 'A'),
      row('172.16.5.0/24', 'B'),
      row('172.16.5.128/25', 'C'),
    ];
    expect(bestRoute('172.16.5.200', rows)?.nextHop).toBe('C');
    expect(right('s3-lpm-25')).toMatch(/^C,/);
  });

  it('the MSS the server sends with', () => {
    const syn = synOptions({ mss: 1200 });
    const { serverSendMss } = negotiateTcpOptions(syn, synAckOptions({ mss: 1460 }, syn));
    expect(right('tcp-mss-server')).toBe(`${serverSendMss} bytes`);
  });

  it('the TTL after two routers, and as it reaches the second of three', () => {
    expect(right('s3-ttl-two-routers')).toBe(String(64 - 2));
    expect(right('s3-ttl-at-r2')).toBe(String(64 - 1));
  });
});
