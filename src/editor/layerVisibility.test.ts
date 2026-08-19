import { describe, expect, it } from 'vitest';
import type { LayerId } from '../types/layers';
import type { NetlabEdge, NetlabNode } from '../types/topology';
import { visibleTopology } from './layerVisibility';

function node(id: string, layerId: LayerId): NetlabNode {
  return {
    id,
    type: layerId === 'l2' ? 'switch' : 'router',
    position: { x: 0, y: 0 },
    data: { label: id, layerId, role: layerId === 'l2' ? 'switch' : 'router' },
  } as NetlabNode;
}

function edge(id: string, source: string, target: string): NetlabEdge {
  return { id, source, target } as NetlabEdge;
}

const TOPOLOGY = {
  nodes: [node('sw1', 'l2'), node('sw2', 'l2'), node('r1', 'l3'), node('c1', 'l7')],
  edges: [edge('e-sw', 'sw1', 'sw2'), edge('e-up', 'sw1', 'r1'), edge('e-cli', 'c1', 'sw2')],
};

const ALL: ReadonlySet<LayerId> = new Set<LayerId>(['l1', 'l2', 'l3', 'l4', 'l7']);

describe('layer visibility', () => {
  it('paints everything when every layer is on', () => {
    const view = visibleTopology(TOPOLOGY, ALL);
    expect(view.nodes).toHaveLength(4);
    expect(view.edges.map((e) => e.id)).toEqual(['e-sw', 'e-up', 'e-cli']);
  });

  it('keeps only the nodes of the selected layers', () => {
    const view = visibleTopology(TOPOLOGY, new Set<LayerId>(['l2']));
    expect(view.nodes.map((n) => n.id)).toEqual(['sw1', 'sw2']);
  });

  it('drops an edge as soon as either endpoint is hidden', () => {
    // The L2-only view must not show the uplink to a router that is not drawn —
    // that would claim an adjacency to nothing.
    const view = visibleTopology(TOPOLOGY, new Set<LayerId>(['l2']));
    expect(view.edges.map((e) => e.id)).toEqual(['e-sw']);

    // Symmetric: hiding the L2 switches removes the client's link too, even
    // though the client itself is still shown.
    const l7 = visibleTopology(TOPOLOGY, new Set<LayerId>(['l7']));
    expect(l7.nodes.map((n) => n.id)).toEqual(['c1']);
    expect(l7.edges).toEqual([]);
  });

  it('shows an empty canvas rather than throwing when nothing is selected', () => {
    expect(visibleTopology(TOPOLOGY, new Set<LayerId>())).toEqual({ nodes: [], edges: [] });
  });

  it('never mutates the canonical topology', () => {
    const before = JSON.stringify(TOPOLOGY);
    visibleTopology(TOPOLOGY, new Set<LayerId>(['l3']));
    expect(JSON.stringify(TOPOLOGY)).toBe(before);
  });
});
