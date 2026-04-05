import { describe, it, expect } from 'vitest';
import { isValidConnection, isValidConnectionBetweenNodes, isValidEdge } from './connectionValidator';
import type { NetlabNode, NetlabEdge } from '../types/topology';

describe('isValidConnection', () => {
  it('allows client ↔ switch', () => {
    expect(isValidConnection('client', 'switch')).toBe(true);
  });

  it('allows client ↔ router', () => {
    expect(isValidConnection('client', 'router')).toBe(true);
  });

  it('allows server ↔ switch', () => {
    expect(isValidConnection('server', 'switch')).toBe(true);
  });

  it('allows server ↔ router', () => {
    expect(isValidConnection('server', 'router')).toBe(true);
  });

  it('allows switch ↔ switch', () => {
    expect(isValidConnection('switch', 'switch')).toBe(true);
  });

  it('allows switch ↔ router', () => {
    expect(isValidConnection('switch', 'router')).toBe(true);
  });

  it('allows router ↔ router', () => {
    expect(isValidConnection('router', 'router')).toBe(true);
  });

  it('blocks client ↔ client', () => {
    expect(isValidConnection('client', 'client')).toBe(false);
  });

  it('blocks server ↔ server', () => {
    expect(isValidConnection('server', 'server')).toBe(false);
  });

  it('blocks client ↔ server', () => {
    expect(isValidConnection('client', 'server')).toBe(false);
  });

  it('blocks server ↔ client (symmetric)', () => {
    expect(isValidConnection('server', 'client')).toBe(false);
  });

  it('allows when source role is undefined', () => {
    expect(isValidConnection(undefined, 'client')).toBe(true);
  });

  it('allows when target role is undefined', () => {
    expect(isValidConnection('server', undefined)).toBe(true);
  });

  it('allows when both roles are undefined', () => {
    expect(isValidConnection(undefined, undefined)).toBe(true);
  });
});

function makeNode(id: string, role: string): NetlabNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id, layerId: 'l7-application', role },
  } as NetlabNode;
}

describe('isValidConnectionBetweenNodes', () => {
  const nodes: NetlabNode[] = [
    makeNode('client-1', 'client'),
    makeNode('server-1', 'server'),
    makeNode('router-1', 'router'),
    makeNode('switch-1', 'switch'),
  ];

  it('allows client → router', () => {
    expect(isValidConnectionBetweenNodes(nodes, 'client-1', 'router-1')).toBe(true);
  });

  it('allows client → switch', () => {
    expect(isValidConnectionBetweenNodes(nodes, 'client-1', 'switch-1')).toBe(true);
  });

  it('blocks client → client', () => {
    expect(isValidConnectionBetweenNodes(nodes, 'client-1', 'client-1')).toBe(false);
  });

  it('blocks client → server', () => {
    expect(isValidConnectionBetweenNodes(nodes, 'client-1', 'server-1')).toBe(false);
  });

  it('allows when source ID is not found', () => {
    expect(isValidConnectionBetweenNodes(nodes, 'unknown', 'client-1')).toBe(true);
  });

  it('allows when target ID is not found', () => {
    expect(isValidConnectionBetweenNodes(nodes, 'client-1', 'unknown')).toBe(true);
  });

  it('allows when source ID is null', () => {
    expect(isValidConnectionBetweenNodes(nodes, null, 'client-1')).toBe(true);
  });

  it('allows when target ID is null', () => {
    expect(isValidConnectionBetweenNodes(nodes, 'client-1', null)).toBe(true);
  });
});

describe('isValidEdge', () => {
  const nodes: NetlabNode[] = [
    makeNode('client-1', 'client'),
    makeNode('server-1', 'server'),
    makeNode('router-1', 'router'),
  ];

  function makeEdge(source: string, target: string): NetlabEdge {
    return { id: `${source}-${target}`, source, target } as NetlabEdge;
  }

  it('returns true for valid edge (client → router)', () => {
    expect(isValidEdge(nodes, makeEdge('client-1', 'router-1'))).toBe(true);
  });

  it('returns false for invalid edge (client → server)', () => {
    expect(isValidEdge(nodes, makeEdge('client-1', 'server-1'))).toBe(false);
  });

  it('returns false for invalid edge (server → server)', () => {
    expect(isValidEdge(nodes, makeEdge('server-1', 'server-1'))).toBe(false);
  });
});
