import { describe, expect, it } from 'vitest';
import type { NetlabEdge, NetlabNode } from '../types/topology';
import { validateTopology } from './connectionValidator';
import { applyTopologyPatch, suggestFix, type TopologyPatch } from './connectionFixers';

function node(id: string, role: string, data: Partial<NetlabNode['data']> = {}): NetlabNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      layerId: role === 'router' ? 'l3' : role === 'switch' ? 'l2' : 'l7',
      role,
      ...data,
    },
  } as NetlabNode;
}

function edge(
  id: string,
  source: string,
  target: string,
  extra: Partial<NetlabEdge> = {},
): NetlabEdge {
  return { id, source, target, ...extra } as NetlabEdge;
}

function firstError(nodes: NetlabNode[], edges: NetlabEdge[], edgeId: string) {
  return validateTopology(nodes, edges).edgeResults.get(edgeId);
}

describe('suggestFix', () => {
  it('endpoint-to-endpoint → insert-switch (recommended) + ghost focus', () => {
    const nodes = [
      node('c1', 'client', { ip: '10.0.0.1' }),
      node('s1', 'server', { ip: '10.0.0.2' }),
    ];
    const e = edge('e1', 'c1', 's1');
    const fixes = suggestFix('endpoint-to-endpoint', { edge: e, nodes });
    expect(fixes[0]?.patch).toEqual({
      kind: 'insert-switch',
      edgeId: 'e1',
      sourceId: 'c1',
      targetId: 's1',
    });
    expect(fixes[1]?.ghost).toBe(true);
    expect(fixes[1]?.patch).toBeUndefined();
  });

  it('duplicate-edge and self-loop → remove-edge', () => {
    const nodes = [node('a', 'router'), node('b', 'router')];
    expect(suggestFix('duplicate-edge', { edge: edge('e1', 'a', 'b'), nodes })[0]?.patch).toEqual({
      kind: 'remove-edge',
      edgeId: 'e1',
    });
    expect(suggestFix('self-loop', { edge: edge('e2', 'a', 'a'), nodes })[0]?.patch).toEqual({
      kind: 'remove-edge',
      edgeId: 'e2',
    });
  });

  it('missing-ip → assign next free host in the default subnet when no peer CIDR exists', () => {
    const nodes = [node('c1', 'client'), node('sw', 'switch')];
    const fixes = suggestFix('missing-ip', { edge: edge('e1', 'c1', 'sw'), nodes });
    expect(fixes[0]?.patch).toEqual({
      kind: 'assign-ip',
      nodeId: 'c1',
      ip: '192.168.1.10',
      prefix: 24,
    });
  });

  it('subnet-mismatch → align the target router interface to the source subnet', () => {
    const r1 = node('r1', 'router', {
      interfaces: [
        {
          id: 'r1-e1',
          name: 'eth1',
          ipAddress: '10.0.0.1',
          prefixLength: 30,
          macAddress: 'm1',
          connectedEdgeId: 'e1',
        },
      ],
    });
    const r2 = node('r2', 'router', {
      interfaces: [
        {
          id: 'r2-e0',
          name: 'eth0',
          ipAddress: '172.16.0.1',
          prefixLength: 30,
          macAddress: 'm2',
          connectedEdgeId: 'e1',
        },
      ],
    });
    const e = edge('e1', 'r1', 'r2', { sourceHandle: 'r1-e1', targetHandle: 'r2-e0' });
    const fixes = suggestFix('subnet-mismatch', { edge: e, nodes: [r1, r2] });
    expect(fixes[0]?.patch).toEqual({
      kind: 'align-subnet',
      nodeId: 'r2',
      interfaceId: 'r2-e0',
      ip: '10.0.0.2',
      prefix: 30,
    });
  });
});

describe('applyTopologyPatch clears the validation issue', () => {
  it('insert-switch removes the endpoint-to-endpoint error', () => {
    const nodes = [
      node('c1', 'client', { ip: '10.0.0.1' }),
      node('s1', 'server', { ip: '10.0.0.2' }),
    ];
    const edges = [edge('e1', 'c1', 's1')];
    expect(
      firstError(nodes, edges, 'e1')?.errors.some((x) => x.code === 'endpoint-to-endpoint'),
    ).toBe(true);
    const patch = suggestFix('endpoint-to-endpoint', { edge: edges[0]!, nodes })[0]!
      .patch as TopologyPatch;
    const next = applyTopologyPatch(patch, { nodes, edges });
    expect(next.edges.some((e) => e.id === 'e1')).toBe(false);
    const result = validateTopology(next.nodes, next.edges);
    const allErrors = Array.from(result.edgeResults.values()).flatMap((r) => r.errors);
    expect(allErrors.some((x) => x.code === 'endpoint-to-endpoint')).toBe(false);
    // The new switch sits between the endpoints.
    expect(next.nodes.some((n) => n.data.role === 'switch')).toBe(true);
  });

  it('assign-ip clears the missing-ip warning', () => {
    const nodes = [node('c1', 'client'), node('sw', 'switch')];
    const edges = [edge('e1', 'c1', 'sw')];
    expect(firstError(nodes, edges, 'e1')?.warnings.some((x) => x.code === 'missing-ip')).toBe(
      true,
    );
    const patch = suggestFix('missing-ip', { edge: edges[0]!, nodes })[0]!.patch as TopologyPatch;
    const next = applyTopologyPatch(patch, { nodes, edges });
    expect(
      firstError(next.nodes, next.edges, 'e1')?.warnings.some((x) => x.code === 'missing-ip'),
    ).toBe(false);
  });

  it('align-subnet clears the subnet-mismatch warning', () => {
    const r1 = node('r1', 'router', {
      interfaces: [
        {
          id: 'r1-e1',
          name: 'eth1',
          ipAddress: '10.0.0.1',
          prefixLength: 30,
          macAddress: 'm1',
          connectedEdgeId: 'e1',
        },
      ],
    });
    const r2 = node('r2', 'router', {
      interfaces: [
        {
          id: 'r2-e0',
          name: 'eth0',
          ipAddress: '172.16.0.1',
          prefixLength: 30,
          macAddress: 'm2',
          connectedEdgeId: 'e1',
        },
      ],
    });
    const edges = [edge('e1', 'r1', 'r2', { sourceHandle: 'r1-e1', targetHandle: 'r2-e0' })];
    const nodes = [r1, r2];
    expect(firstError(nodes, edges, 'e1')?.warnings.some((x) => x.code === 'subnet-mismatch')).toBe(
      true,
    );
    const patch = suggestFix('subnet-mismatch', { edge: edges[0]!, nodes })[0]!
      .patch as TopologyPatch;
    const next = applyTopologyPatch(patch, { nodes, edges });
    expect(
      firstError(next.nodes, next.edges, 'e1')?.warnings.some((x) => x.code === 'subnet-mismatch'),
    ).toBe(false);
  });
});
