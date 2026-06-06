import { describe, expect, it } from 'vitest';
import type { NetworkArea } from '../types/areas';
import type { NetlabEdge, NetlabNode } from '../types/topology';
import { applyAreaLod, clusterNodeId, AREA_CLUSTER_NODE_TYPE } from './areaLod';

function realNode(id: string): NetlabNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id, layerId: 'l3', role: 'client' },
  } as NetlabNode;
}

function areaBgNode(areaId: string): NetlabNode {
  return {
    id: `__area__${areaId}`,
    type: 'netlab-area',
    position: { x: 0, y: 0 },
    data: { areaId, label: areaId, layerId: 'l1', role: 'area' },
  } as unknown as NetlabNode;
}

function edge(id: string, source: string, target: string): NetlabEdge {
  return { id, source, target } as NetlabEdge;
}

function area(id: string, devices: string[]): NetworkArea {
  return {
    id,
    name: id,
    type: 'private',
    subnet: '10.0.0.0/24',
    devices,
    visualConfig: { x: 0, y: 0, width: 300, height: 400 },
  } as NetworkArea;
}

const NO_EXPANDED = new Set<string>();

describe('applyAreaLod', () => {
  it('passes through unchanged when nothing should collapse', () => {
    const dmz = area('dmz', ['h1', 'h2']);
    const nodes = [areaBgNode('dmz'), realNode('h1'), realNode('h2')];
    const edges = [edge('e1', 'h1', 'h2')];
    const out = applyAreaLod({ areas: [dmz], nodes, edges, zoom: 1, expandedAreaIds: NO_EXPANDED });
    expect(out.nodes).toBe(nodes);
    expect(out.edges).toBe(edges);
  });

  it('collapses an area past the node-count threshold', () => {
    const members = Array.from({ length: 9 }, (_, i) => `h${i}`);
    const dmz = area('dmz', members);
    const nodes = [areaBgNode('dmz'), ...members.map(realNode), realNode('gw')];
    const edges = [
      edge('e-intra', 'h0', 'h1'), // fully inside → hidden
      edge('e-boundary', 'h0', 'gw'), // crosses out → repointed
    ];
    const out = applyAreaLod({ areas: [dmz], nodes, edges, zoom: 1, expandedAreaIds: NO_EXPANDED });

    // Members + area background removed; one cluster + the external node remain.
    expect(out.nodes.map((n) => n.id).sort()).toEqual([clusterNodeId('dmz'), 'gw'].sort());
    const cluster = out.nodes.find((n) => n.id === clusterNodeId('dmz'))!;
    expect(cluster.type).toBe(AREA_CLUSTER_NODE_TYPE);
    expect((cluster.data as unknown as { hostCount: number }).hostCount).toBe(9);

    // Intra-area edge gone; boundary edge re-pointed to the cluster with no handle.
    expect(out.edges.map((e) => e.id)).toEqual(['e-boundary']);
    const boundary = out.edges[0]!;
    expect(boundary.source).toBe(clusterNodeId('dmz'));
    expect(boundary.target).toBe('gw');
    expect(boundary.sourceHandle).toBeNull();
  });

  it('collapses on low zoom even with few nodes', () => {
    const dmz = area('dmz', ['h1', 'h2']);
    const nodes = [areaBgNode('dmz'), realNode('h1'), realNode('h2')];
    const out = applyAreaLod({
      areas: [dmz],
      nodes,
      edges: [],
      zoom: 0.4,
      expandedAreaIds: NO_EXPANDED,
    });
    expect(out.nodes.some((n) => n.id === clusterNodeId('dmz'))).toBe(true);
    expect(out.nodes.some((n) => n.id === 'h1')).toBe(false);
  });

  it('keeps an area expanded when the user pinned it open', () => {
    const dmz = area('dmz', ['h1', 'h2']);
    const nodes = [areaBgNode('dmz'), realNode('h1'), realNode('h2')];
    const out = applyAreaLod({
      areas: [dmz],
      nodes,
      edges: [],
      zoom: 0.4,
      expandedAreaIds: new Set(['dmz']),
    });
    expect(out.nodes).toBe(nodes); // no collapse → identity passthrough
  });
});
