import { describe, expect, it } from 'vitest';
import { EMPTY_FAILURE_STATE } from '../../../types/failure';
import { CLIENT_MAC, SERVER_MAC, makePacket } from '../../__fixtures__/helpers';
import { directTopology, directTopologyWithoutServerMac } from '../../__fixtures__/topologies';
import { AddressPlane } from '../../AddressPlane';
import { InterfaceResolver } from './InterfaceResolver';
import { MacResolver } from './MacResolver';

function makeMacResolver(topology = directTopology()) {
  const ifaceResolver = new InterfaceResolver(topology);
  return new MacResolver(topology, ifaceResolver, new AddressPlane(topology));
}

describe('MacResolver', () => {
  it('resolveEndpointMac returns MAC for client', () => {
    const resolver = makeMacResolver();
    expect(resolver.resolveEndpointMac('client-1')).toBe(CLIENT_MAC);
  });

  it('resolveEndpointMac returns null for unknown node', () => {
    const resolver = makeMacResolver();
    expect(resolver.resolveEndpointMac('nonexistent')).toBeNull();
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
