import type { NetworkTopology, NetlabNode, NetlabEdge } from '../types/topology';
import type { NetworkArea } from '../types/areas';

type TopologyInput = Pick<NetworkTopology, 'nodes' | 'edges' | 'areas'>;

/**
 * Encode a topology to a URL query string fragment (`?topo=<base64url>`).
 * routeTables is excluded — it is recomputed on load.
 */
export function encodeTopology(topology: TopologyInput): string {
  const json = JSON.stringify({
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  });
  const b64 = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `?topo=${b64}`;
}

/**
 * Decode a topology from `window.location.search`.
 * Returns null if the parameter is absent, malformed, or structurally invalid.
 */
export function decodeTopology(search: string): NetworkTopology | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('topo');
    if (!raw) return null;

    // Restore standard base64 from URL-safe base64
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const parsed: unknown = JSON.parse(json);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>).nodes) ||
      !Array.isArray((parsed as Record<string, unknown>).edges) ||
      !Array.isArray((parsed as Record<string, unknown>).areas)
    ) {
      return null;
    }

    const p = parsed as { nodes: NetlabNode[]; edges: NetlabEdge[]; areas: NetworkArea[] };
    return { nodes: p.nodes, edges: p.edges, areas: p.areas, routeTables: new Map() };
  } catch {
    return null;
  }
}
