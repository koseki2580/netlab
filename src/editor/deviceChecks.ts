import type { NetlabEdge, NetlabNode } from '../types/topology';

export type DeviceCheckCode = 'isolated' | 'host-unlinked' | 'router-no-address';

export interface DeviceIssue {
  readonly nodeId: string;
  readonly name: string;
  readonly code: DeviceCheckCode;
}

const HOST_ROLES = new Set(['client', 'server']);

/** An interface counts as addressed only once it has a real address. */
function hasAddressedInterface(node: NetlabNode): boolean {
  return (node.data.interfaces ?? []).some(
    (iface) => Boolean(iface.ipAddress) && iface.ipAddress !== '0.0.0.0',
  );
}

/**
 * Faults of a device rather than of a link.
 *
 * The link checks only look at cables that exist, so a device with no cable at
 * all, or a router with nothing to route from, passed as "no issues" and the
 * run then failed. These are the mistakes a learner building a first network
 * actually makes.
 */
export function checkDevices(
  nodes: readonly NetlabNode[],
  edges: readonly NetlabEdge[],
): DeviceIssue[] {
  const linked = new Set<string>();
  for (const edge of edges) {
    linked.add(edge.source);
    linked.add(edge.target);
  }
  const issues: DeviceIssue[] = [];
  for (const node of nodes) {
    const name = node.data.label || node.id;
    if (!linked.has(node.id)) {
      issues.push({
        nodeId: node.id,
        name,
        code: HOST_ROLES.has(node.data.role) ? 'host-unlinked' : 'isolated',
      });
    }
    if (node.data.role === 'router' && !hasAddressedInterface(node)) {
      issues.push({ nodeId: node.id, name, code: 'router-no-address' });
    }
  }
  return issues;
}
