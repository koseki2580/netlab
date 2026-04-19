import { describe, expect, it } from 'vitest';
import type { NetworkTopology } from '../../../types/topology';
import { makePacket } from '../../__fixtures__/helpers';
import { PortResolver } from './PortResolver';

function switchTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
      },
      {
        id: 'switch-1',
        type: 'switch',
        position: { x: 100, y: 0 },
        data: {
          label: 'SW-1',
          role: 'switch',
          layerId: 'l2',
          ports: [
            { id: 'port0', name: 'Gi0/0', edgeId: 'e1', mode: 'access', vlan: 10 },
            { id: 'port1', name: 'Gi0/1', edgeId: 'e2', mode: 'access', vlan: 10 },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 200, y: 0 },
        data: { label: 'Server', role: 'server', layerId: 'l7', ip: '10.0.0.20' },
      },
    ],
    edges: [
      { id: 'e1', source: 'client-1', target: 'switch-1', targetHandle: 'port0' },
      { id: 'e2', source: 'switch-1', target: 'server-1', sourceHandle: 'port1' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

describe('PortResolver', () => {
  it('resolvePortFromEdge returns the ingress port for a switch', () => {
    const resolver = new PortResolver(switchTopology());
    // e1 target is switch-1, targetHandle is 'port0'
    const port = resolver.resolvePortFromEdge('switch-1', 'e1', 'ingress');
    expect(port).not.toBeNull();
    expect(port!.id).toBe('port0');
    expect(port!.name).toBe('Gi0/0');
  });

  it('resolvePortFromEdge returns the egress port for a switch', () => {
    const resolver = new PortResolver(switchTopology());
    // e2 source is switch-1, sourceHandle is 'port1'
    const port = resolver.resolvePortFromEdge('switch-1', 'e2', 'egress');
    expect(port).not.toBeNull();
    expect(port!.id).toBe('port1');
  });

  it('resolvePortFromEdge returns null for non-switch node', () => {
    const resolver = new PortResolver(switchTopology());
    const port = resolver.resolvePortFromEdge('client-1', 'e1', 'egress');
    expect(port).toBeNull();
  });

  it('resolvePortFromEdge returns null for unmatched edge', () => {
    const resolver = new PortResolver(switchTopology());
    const port = resolver.resolvePortFromEdge('switch-1', 'e999', 'ingress');
    expect(port).toBeNull();
  });

  it('getForwardingVlanId returns VLAN from vlanId field', () => {
    const resolver = new PortResolver(switchTopology());
    const packet = {
      ...makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '10.0.0.20'),
      vlanId: 10,
    };
    const vlanId = resolver.getForwardingVlanId(packet);
    expect(vlanId).toBe(10);
  });

  it('getForwardingVlanId returns 0 for packet without ingress port', () => {
    const resolver = new PortResolver(switchTopology());
    const packet = makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '10.0.0.20');
    const vlanId = resolver.getForwardingVlanId(packet);
    expect(vlanId).toBe(0);
  });
});
