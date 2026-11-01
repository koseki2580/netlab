import { describe, expect, it } from 'vitest';
import { solicitedNodeAddress, solicitedNodeMac } from './ndp';

// TC-982 — the IPv6 lesson's neighbour-discovery addresses (RFC 4291 §2.7.1, RFC 2464 §7).
describe('the solicited-node address and its multicast MAC', () => {
  it('matches the RFC 4291 example: 4037::01:800:200E:8C6C', () => {
    expect(solicitedNodeAddress('4037::01:800:200E:8C6C')).toBe('ff02::1:ff0e:8c6c');
    expect(solicitedNodeMac('4037::01:800:200E:8C6C')).toBe('33:33:ff:0e:8c:6c');
  });

  it.each([
    ['2001:db8:2::20', 'ff02::1:ff00:20', '33:33:ff:00:00:20'],
    ['2001:db8:1::1', 'ff02::1:ff00:1', '33:33:ff:00:00:01'],
    ['fe80::2:abcd:1234:5678', 'ff02::1:ff34:5678', '33:33:ff:34:56:78'],
  ])('%s → %s in a frame to %s', (address, solicited, mac) => {
    expect(solicitedNodeAddress(address)).toBe(solicited);
    expect(solicitedNodeMac(address)).toBe(mac);
  });

  it('keeps only the last 24 bits, so addresses that share them share the group', () => {
    expect(solicitedNodeAddress('2001:db8:1::abcd:20')).toBe(
      solicitedNodeAddress('2001:db8:2::cd:20'),
    );
  });
});
