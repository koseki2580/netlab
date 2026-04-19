import { describe, expect, it } from 'vitest';
import { EMPTY_FAILURE_STATE } from '../../../types/failure';
import { CLIENT_MAC, SERVER_MAC, makePacket } from '../../__fixtures__/helpers';
import { directTopology, directTopologyWithoutServerMac } from '../../__fixtures__/topologies';
import { InterfaceResolver } from './InterfaceResolver';
import { MacResolver } from './MacResolver';

function makeMacResolver(topology = directTopology()) {
  const ifaceResolver = new InterfaceResolver(topology);
  return new MacResolver(topology, ifaceResolver, (node) => node?.data.ip);
}

describe('MacResolver', () => {
  it('isPlaceholderMac recognizes default placeholder', () => {
    const resolver = makeMacResolver();
    expect(resolver.isPlaceholderMac('00:00:00:00:00:01')).toBe(true);
    expect(resolver.isPlaceholderMac('00:00:00:00:00:02')).toBe(true);
  });

  it('isPlaceholderMac returns false for real MAC', () => {
    const resolver = makeMacResolver();
    expect(resolver.isPlaceholderMac(CLIENT_MAC)).toBe(false);
    expect(resolver.isPlaceholderMac(SERVER_MAC)).toBe(false);
  });

  it('resolveEndpointMac returns MAC for client', () => {
    const resolver = makeMacResolver();
    expect(resolver.resolveEndpointMac('client-1')).toBe(CLIENT_MAC);
  });

  it('resolveEndpointMac returns null for unknown node', () => {
    const resolver = makeMacResolver();
    expect(resolver.resolveEndpointMac('nonexistent')).toBeNull();
  });

  it('nodeOwnsIp returns true for matching IP', () => {
    const resolver = makeMacResolver();
    const node = new InterfaceResolver(directTopology()).findNode('client-1')!;
    expect(resolver.nodeOwnsIp(node, '10.0.0.10')).toBe(true);
  });

  it('nodeOwnsIp returns false for non-matching IP', () => {
    const resolver = makeMacResolver();
    const node = new InterfaceResolver(directTopology()).findNode('client-1')!;
    expect(resolver.nodeOwnsIp(node, '192.168.1.1')).toBe(false);
  });

  it('findNodeByIp returns node with matching IP', () => {
    const resolver = makeMacResolver();
    const found = resolver.findNodeByIp('10.0.0.10');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('client-1');
  });

  it('findNodeByIp returns null for unknown IP', () => {
    const resolver = makeMacResolver();
    expect(resolver.findNodeByIp('192.168.99.99')).toBeNull();
  });

  it('resolveDstMac returns MAC for direct neighbor', () => {
    const topology = directTopology();
    const resolver = makeMacResolver(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const mac = resolver.resolveDstMac(
      'client-1',
      'server-1',
      undefined,
      packet,
      EMPTY_FAILURE_STATE,
    );
    expect(mac).toBe(SERVER_MAC);
  });

  it('resolveDstMac falls back to deterministic MAC when server has no explicit MAC', () => {
    const topology = directTopologyWithoutServerMac();
    const resolver = makeMacResolver(topology);
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10');
    const mac = resolver.resolveDstMac(
      'client-1',
      'server-1',
      undefined,
      packet,
      EMPTY_FAILURE_STATE,
    );
    // resolveEndpointMac falls back to deriveDeterministicMac when mac is undefined
    expect(typeof mac).toBe('string');
    expect(mac).not.toBe(SERVER_MAC);
  });
});
