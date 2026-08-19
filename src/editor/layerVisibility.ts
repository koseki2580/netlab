import type { LayerId } from '../types/layers';
import type { NetlabEdge, NetlabNode } from '../types/topology';

/**
 * The subset of the topology painted for the current layer selection.
 *
 * An edge is only drawn when BOTH of its endpoints are visible: a link dangling
 * from a hidden node would tell a learner that L3 has an adjacency where the
 * canvas shows nothing to adjoin. Hiding is presentation only — the canonical
 * topology, and therefore the simulation, is untouched.
 *
 * Until the maxGraph adapter lands this is computed here; afterwards the same
 * selection drives the engine's own layer visibility, so the UI and its tests do
 * not change with the engine.
 */
export function visibleTopology(
  topology: { nodes: readonly NetlabNode[]; edges: readonly NetlabEdge[] },
  visibleLayers: ReadonlySet<LayerId>,
): { nodes: NetlabNode[]; edges: NetlabEdge[] } {
  const nodes = topology.nodes.filter((node) => visibleLayers.has(node.data.layerId));
  const shown = new Set(nodes.map((node) => node.id));
  const edges = topology.edges.filter((edge) => shown.has(edge.source) && shown.has(edge.target));
  return { nodes, edges };
}
