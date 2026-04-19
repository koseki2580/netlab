import { describe, expect, it } from 'vitest';
import { EMPTY_FAILURE_STATE } from '../../../types/failure';
import { getRequired } from '../../../utils/typedAccess';
import { directTopology, singleRouterTopology } from '../../__fixtures__/topologies';
import { InterfaceResolver } from './InterfaceResolver';

describe('InterfaceResolver', () => {
  it('findNode returns the node when it exists', () => {
    const resolver = new InterfaceResolver(directTopology());
    const node = resolver.findNode('client-1');
    if (node == null) {
      throw new Error('expected client-1 node');
    }
    expect(node.data.role).toBe('client');
  });

  it('findNode returns null for unknown node', () => {
    const resolver = new InterfaceResolver(directTopology());
    expect(resolver.findNode('does-not-exist')).toBeNull();
  });

  it('getNeighbors returns connected nodes', () => {
    const resolver = new InterfaceResolver(directTopology());
    const neighbors = resolver.getNeighbors('client-1');
    expect(neighbors).toHaveLength(1);
    expect(getRequired(neighbors, 0, { reason: 'expected direct neighbor' }).nodeId).toBe(
      'server-1',
    );
  });

  it('getNeighbors excludes specified node', () => {
    const resolver = new InterfaceResolver(singleRouterTopology());
    const neighbors = resolver.getNeighbors('router-1', 'client-1');
    expect(neighbors.every((n) => n.nodeId !== 'client-1')).toBe(true);
  });

  it('getNeighbors excludes down edges', () => {
    const resolver = new InterfaceResolver(directTopology());
    const failureState = { ...EMPTY_FAILURE_STATE, downEdgeIds: new Set(['e1']) };
    const neighbors = resolver.getNeighbors('client-1', null, failureState);
    expect(neighbors).toHaveLength(0);
  });

  it('resolveEgress returns interface for a router with matching route', () => {
    const resolver = new InterfaceResolver(singleRouterTopology());
    const iface = resolver.resolveEgress('router-1', '203.0.113.10');
    if (iface == null) {
      throw new Error('expected egress interface');
    }
    expect(iface.id).toBe('eth1');
  });

  it('resolveEgress returns null for unknown destination', () => {
    const resolver = new InterfaceResolver(singleRouterTopology());
    const iface = resolver.resolveEgress('router-1', '8.8.8.8');
    expect(iface).toBeNull();
  });

  it('getLogical returns router interfaces', () => {
    const resolver = new InterfaceResolver(singleRouterTopology());
    const node = resolver.findNode('router-1');
    const interfaces = resolver.getLogical(node);
    expect(interfaces.length).toBeGreaterThanOrEqual(2);
    expect(interfaces.some((i) => i.id === 'eth0')).toBe(true);
  });

  it('getLogical returns empty for non-router', () => {
    const resolver = new InterfaceResolver(directTopology());
    const node = resolver.findNode('client-1');
    const interfaces = resolver.getLogical(node);
    expect(interfaces).toHaveLength(0);
  });

  it('getLogical returns empty for null node', () => {
    const resolver = new InterfaceResolver(directTopology());
    expect(resolver.getLogical(null)).toHaveLength(0);
  });

  it('findLogicalById returns matching interface', () => {
    const resolver = new InterfaceResolver(singleRouterTopology());
    const iface = resolver.findLogicalById('router-1', 'eth0');
    if (iface == null) {
      throw new Error('expected logical interface eth0');
    }
    expect(iface.ipAddress).toBe('10.0.0.1');
  });

  it('findLogicalById returns null for unknown interfaceId', () => {
    const resolver = new InterfaceResolver(singleRouterTopology());
    expect(resolver.findLogicalById('router-1', 'nonexistent')).toBeNull();
  });
});
