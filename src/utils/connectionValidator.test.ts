import { describe, it, expect } from 'vitest';
import {
  isValidConnection,
  isValidConnectionBetweenNodes,
  isValidEdge,
  validateConnection,
} from './connectionValidator';
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

function makeNode(
  id: string,
  role: string,
  overrides: Partial<NetlabNode['data']> = {},
): NetlabNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id, layerId: role === 'router' ? 'l3' : role === 'switch' ? 'l2' : 'l7', role, ...overrides },
  } as NetlabNode;
}

function makeEdge(
  source: string,
  target: string,
  overrides: Partial<NetlabEdge> = {},
): NetlabEdge {
  return {
    id: overrides.id ?? `${source}-${target}`,
    source,
    target,
    ...overrides,
  } as NetlabEdge;
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

describe('validateConnection', () => {
  it('reports a self-loop error', () => {
    const nodes = [makeNode('router-1', 'router')];

    const result = validateConnection(nodes, [], 'router-1', 'router-1');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        code: 'self-loop',
        message: 'Self-loop: a node cannot connect to itself',
      },
    ]);
  });

  it('reports a duplicate-edge error regardless of edge direction', () => {
    const nodes = [makeNode('router-1', 'router'), makeNode('switch-1', 'switch')];
    const edges = [makeEdge('router-1', 'switch-1')];

    const result = validateConnection(nodes, edges, 'switch-1', 'router-1');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'duplicate-edge',
      message: 'Duplicate edge: nodes are already connected',
    });
  });

  it('reports an interface-in-use error for a source handle', () => {
    const nodes = [
      makeNode('router-1', 'router', {
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:00:00:01' },
        ],
      }),
      makeNode('switch-1', 'switch'),
      makeNode('server-1', 'server'),
    ];
    const edges = [
      makeEdge('router-1', 'switch-1', { sourceHandle: 'eth0' }),
    ];

    const result = validateConnection(nodes, edges, 'router-1', 'server-1', 'eth0', null);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'interface-in-use',
      message: 'Interface already in use: eth0',
    });
  });

  it('reports an interface-in-use error for a target handle', () => {
    const nodes = [
      makeNode('router-1', 'router'),
      makeNode('switch-1', 'switch', {
        ports: [{ id: 'p0', name: 'fa0/0', macAddress: '00:00:00:00:00:02' }],
      }),
    ];
    const edges = [
      makeEdge('router-1', 'switch-1', { targetHandle: 'p0' }),
    ];

    const result = validateConnection(nodes, edges, 'router-1', 'switch-1', null, 'p0');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'interface-in-use',
      message: 'Interface already in use: fa0/0',
    });
  });

  it('reports an endpoint-to-endpoint error', () => {
    const nodes = [makeNode('client-1', 'client'), makeNode('server-1', 'server')];

    const result = validateConnection(nodes, [], 'client-1', 'server-1');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'endpoint-to-endpoint',
      message: 'Endpoint-to-endpoint connections are not allowed',
    });
  });

  it('collects multiple errors at once', () => {
    const nodes = [makeNode('client-1', 'client')];

    const result = validateConnection(nodes, [], 'client-1', 'client-1');

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'self-loop',
      message: 'Self-loop: a node cannot connect to itself',
    });
    expect(result.errors).toContainEqual({
      code: 'endpoint-to-endpoint',
      message: 'Endpoint-to-endpoint connections are not allowed',
    });
  });

  it('adds a subnet-mismatch warning for router interfaces in different subnets', () => {
    const nodes = [
      makeNode('router-1', 'router', {
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:00:00:01' },
        ],
      }),
      makeNode('router-2', 'router', {
        interfaces: [
          { id: 'eth1', name: 'eth1', ipAddress: '10.0.1.2', prefixLength: 24, macAddress: '00:00:00:00:00:02' },
        ],
      }),
    ];

    const result = validateConnection(nodes, [], 'router-1', 'router-2', 'eth0', 'eth1');

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual({
      code: 'subnet-mismatch',
      message: 'Subnet mismatch: 10.0.0.1/24 and 10.0.1.2/24 are in different subnets',
    });
  });

  it('adds a missing-ip warning when an IP-requiring node lacks IP configuration', () => {
    const nodes = [makeNode('client-1', 'client'), makeNode('switch-1', 'switch')];

    const result = validateConnection(nodes, [], 'client-1', 'switch-1');

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual({
      code: 'missing-ip',
      message: 'Missing IP configuration on client-1',
    });
  });

  it('returns a valid result for a router-to-switch connection without errors', () => {
    const nodes = [
      makeNode('router-1', 'router', {
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:00:00:01' },
        ],
      }),
      makeNode('switch-1', 'switch'),
    ];

    const result = validateConnection(nodes, [], 'router-1', 'switch-1', 'eth0', null);

    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });
});
