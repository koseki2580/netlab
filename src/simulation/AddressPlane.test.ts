import { describe, expect, it } from 'vitest';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { deriveDeterministicMac } from '../utils/network';
import { AddressPlane, isPlaceholderMac } from './AddressPlane';
import { addressViewOf, topologyWithAddressView } from './addressView';

function node(id: string, data: Partial<NetlabNode['data']>): NetlabNode {
  return {
    id,
    type: String(data.role ?? 'client'),
    position: { x: 0, y: 0 },
    data: { label: id, role: 'client', layerId: 'l7', ...data },
  };
}

const router = node('r1', {
  role: 'router',
  layerId: 'l3',
  interfaces: [
    {
      id: 'r1-g0',
      name: 'g0/0',
      ipAddress: '10.0.0.1',
      prefixLength: 24,
      ipv6Address: '2001:db8::1',
      prefixLength6: 64,
      macAddress: '00:00:00:01:00:01',
      subInterfaces: [
        {
          id: 'r1-g0.10',
          parentInterfaceId: 'r1-g0',
          vlanId: 10,
          ipAddress: '10.10.0.1',
          prefixLength: 24,
        },
      ],
    },
  ],
});
const staticHost = node('pc-static', { ip: '10.0.0.10', mac: '02:00:00:00:00:10' });
const dhcpHost = node('pc-dhcp', { dhcpClient: { enabled: true } });

const topology: NetworkTopology = {
  nodes: [router, staticHost, dhcpHost],
  edges: [],
  areas: [],
  routeTables: new Map(),
};

const leases = new Map([['pc-dhcp', '10.0.0.101']]);
const plane = new AddressPlane(topology, {
  getRuntimeNodeIp: (nodeId) => leases.get(nodeId) ?? null,
});

describe('AddressPlane', () => {
  it('answers a leased address before a static one', () => {
    expect(plane.nodeIp(dhcpHost)).toBe('10.0.0.101');
    expect(plane.nodeIp(staticHost)).toBe('10.0.0.10');
    expect(new AddressPlane(topology).nodeIp(dhcpHost)).toBeUndefined();
  });

  it('falls back to the first interface for a node with no address of its own', () => {
    expect(plane.primaryIp(router)).toBe('10.0.0.1');
    expect(plane.primaryIp(dhcpHost)).toBe('10.0.0.101');
  });

  it('finds the owner of leased, static, interface, sub-interface and IPv6 addresses', () => {
    expect(plane.findOwner('10.0.0.101')?.id).toBe('pc-dhcp');
    expect(plane.findOwner('10.0.0.10')?.id).toBe('pc-static');
    expect(plane.findOwner('10.0.0.1')?.id).toBe('r1');
    expect(plane.findOwner('10.10.0.1')?.id).toBe('r1');
    expect(plane.findOwner('2001:db8:0:0::1')?.id).toBe('r1');
    expect(plane.findOwner('10.0.0.99')).toBeNull();
  });

  it('gives a host its configured MAC, or one derived from its id', () => {
    expect(plane.endpointMac(staticHost)).toBe('02:00:00:00:00:10');
    expect(plane.endpointMac(dhcpHost)).toBe(deriveDeterministicMac('pc-dhcp'));
    expect(plane.endpointMac(node('zero', { mac: '00:00:00:00:00:00' }))).toBe(
      deriveDeterministicMac('zero'),
    );
  });

  it('counts the all-zero MAC as a placeholder, as well as the two builder defaults', () => {
    expect(isPlaceholderMac('00:00:00:00:00:00')).toBe(true);
    expect(isPlaceholderMac('00:00:00:00:00:01')).toBe(true);
    expect(isPlaceholderMac(' 00:00:00:00:00:02 ')).toBe(true);
    expect(isPlaceholderMac('02:00:00:00:00:10')).toBe(false);
  });

  it("hands forwarders a copy carrying the view, leaving the caller's topology static", () => {
    const handed = topologyWithAddressView(topology, plane);
    expect(handed).not.toBe(topology);
    expect(handed.nodes).toBe(topology.nodes);
    expect(addressViewOf(handed).nodeIp(dhcpHost)).toBe('10.0.0.101');
    expect(addressViewOf(topology).nodeIp(dhcpHost)).toBeUndefined();
    expect(addressViewOf(topology).ownsIp(router, '10.10.0.1')).toBe(true);
  });
});
