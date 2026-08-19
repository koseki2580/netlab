import type { NetlabNode } from '../types/topology';

export interface RunEndpoints {
  readonly src: NetlabNode;
  readonly dst: NetlabNode;
  readonly srcIp: string;
  readonly dstIp: string;
}

/** An addressable host: something a packet can be sent from and to. */
function hostIp(node: NetlabNode): string | null {
  if (typeof node.data.ip === 'string' && node.data.ip.length > 0) return node.data.ip;
  // Routers carry their addresses on interfaces rather than on the node.
  const iface = node.data.interfaces?.find((entry) => entry.ipAddress);
  return iface?.ipAddress ?? null;
}

/**
 * Which two nodes a one-click Run should send between.
 *
 * A learner who has just placed a client and a server expects Run to go between
 * *those*, not between two routers that happen to come first, so endpoints are
 * preferred in role order and the source is never reused as the destination.
 * Returns null when the topology cannot answer the question — the Run control
 * then explains itself instead of sending a packet nobody can interpret.
 */
export function pickRunEndpoints(
  nodes: readonly NetlabNode[],
  selectedNodeId?: string | null,
): RunEndpoints | null {
  const addressable = nodes
    .map((node) => ({ node, ip: hostIp(node) }))
    .filter((entry): entry is { node: NetlabNode; ip: string } => entry.ip !== null);
  if (addressable.length < 2) return null;

  const rank = (node: NetlabNode) =>
    node.data.role === 'client' ? 0 : node.data.role === 'server' ? 1 : 2;
  const ordered = [...addressable].sort((a, b) => rank(a.node) - rank(b.node));

  // An explicit selection wins: the learner has already said where to start.
  const chosen = selectedNodeId
    ? (addressable.find((entry) => entry.node.id === selectedNodeId) ?? ordered[0]!)
    : ordered[0]!;
  const dst = ordered.find((entry) => entry.node.id !== chosen.node.id);
  if (!dst) return null;

  return { src: chosen.node, dst: dst.node, srcIp: chosen.ip, dstIp: dst.ip };
}
