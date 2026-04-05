import type { NetlabNode, NetlabEdge } from '../types/topology';

const L7_ROLES = new Set<string>(['client', 'server']);

/**
 * Returns false if both roles are L7 endpoints (client/server).
 * Undefined roles are treated as valid to avoid false positives on non-device nodes.
 */
export function isValidConnection(
  sourceRole: string | undefined,
  targetRole: string | undefined,
): boolean {
  if (!sourceRole || !targetRole) return true;
  return !(L7_ROLES.has(sourceRole) && L7_ROLES.has(targetRole));
}

/**
 * Looks up roles from the nodes array by ID, then delegates to isValidConnection.
 * Returns true if either node is not found (safe default).
 */
export function isValidConnectionBetweenNodes(
  nodes: NetlabNode[],
  sourceId: string | null,
  targetId: string | null,
): boolean {
  const source = nodes.find((n) => n.id === sourceId);
  const target = nodes.find((n) => n.id === targetId);
  return isValidConnection(
    source?.data?.role as string | undefined,
    target?.data?.role as string | undefined,
  );
}

/**
 * Convenience wrapper for classifying an existing edge.
 */
export function isValidEdge(nodes: NetlabNode[], edge: NetlabEdge): boolean {
  return isValidConnectionBetweenNodes(nodes, edge.source, edge.target);
}
