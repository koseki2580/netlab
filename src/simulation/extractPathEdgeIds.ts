import type { PacketTrace } from '../types/simulation';

export function extractPathEdgeIds(trace: PacketTrace): string[] {
  const seen = new Set<string>();
  const edgeIds: string[] = [];

  for (const hop of trace.hops) {
    if (!hop.activeEdgeId || seen.has(hop.activeEdgeId)) {
      continue;
    }

    seen.add(hop.activeEdgeId);
    edgeIds.push(hop.activeEdgeId);
  }

  return edgeIds;
}
