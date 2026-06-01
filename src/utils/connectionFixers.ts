import type { RouterInterface } from '../types/routing';
import type { NetlabEdge, NetlabNode, TopologySnapshot } from '../types/topology';
import { intToIp, ipToInt, networkAddress } from './cidr';
import type { ValidationError, ValidationWarning } from './connectionValidator';

/**
 * C3 — one-click fixes for `validateConnection` issues.
 *
 * `suggestFix(code, ctx)` maps a structured validation `code` to an ordered
 * list of fixes (the first is recommended). A mutation fix carries a
 * {@link TopologyPatch}; a `ghost` fix is a *focus* action (handled by the
 * panel's `onEdgeClick`), never a mutation. `applyTopologyPatch` is a pure
 * snapshot transform so applying a patch and re-running the validator is
 * deterministic — and so the editor can commit it as one undoable step.
 *
 * Kept dependency-free (mirrors `connectionValidator.ts`): it re-derives the
 * specifics (offending node, peer subnet) from the topology rather than
 * threading them through the validator's string messages.
 */
export type FixableCode = ValidationError['code'] | ValidationWarning['code'];

export type TopologyPatch =
  | { kind: 'insert-switch'; edgeId: string; sourceId: string; targetId: string }
  | { kind: 'remove-edge'; edgeId: string }
  | { kind: 'assign-ip'; nodeId: string; interfaceId?: string; ip: string; prefix: number }
  | { kind: 'align-subnet'; nodeId: string; interfaceId: string; ip: string; prefix: number };

export interface ConnectionFix {
  /** Button copy. */
  label: string;
  /** Present for a mutation fix; applied via {@link applyTopologyPatch}. */
  patch?: TopologyPatch;
  /** Ghost fix: a focus action (reuses `onEdgeClick`), not a mutation. */
  ghost?: boolean;
}

export interface FixContext {
  edge: NetlabEdge;
  nodes: readonly NetlabNode[];
}

const IP_REQUIRED_ROLES = new Set<string>(['client', 'server', 'router']);

function findNode(
  nodes: readonly NetlabNode[],
  id: string | null | undefined,
): NetlabNode | undefined {
  return id ? nodes.find((n) => n.id === id) : undefined;
}

function nodeHasIp(node: NetlabNode | undefined): boolean {
  if (!node) return true; // unknown node → don't suggest
  if (node.data.role === 'router') {
    return (node.data.interfaces ?? []).some((iface) => Boolean(iface.ipAddress));
  }
  if (typeof node.data.ip === 'string' && node.data.ip.length > 0) return true;
  return (node.data.interfaces ?? []).some((iface) => Boolean(iface.ipAddress));
}

function ifaceForEdge(node: NetlabNode | undefined, edgeId: string): RouterInterface | undefined {
  if (!node) return undefined;
  const interfaces = node.data.interfaces ?? [];
  return interfaces.find((iface) => iface.connectedEdgeId === edgeId) ?? interfaces[0];
}

/** First interface CIDR found on a node, used to anchor a peer's subnet. */
function anyCidr(node: NetlabNode | undefined): { ip: string; prefix: number } | null {
  for (const iface of node?.data.interfaces ?? []) {
    if (iface.ipAddress) return { ip: iface.ipAddress, prefix: iface.prefixLength };
  }
  if (typeof node?.data.ip === 'string' && node.data.ip.includes('.')) {
    return { ip: node.data.ip, prefix: 24 };
  }
  return null;
}

/** Collect every IPv4 address already used in the topology. */
function usedIps(nodes: readonly NetlabNode[]): Set<number> {
  const used = new Set<number>();
  for (const node of nodes) {
    if (typeof node.data.ip === 'string' && node.data.ip.includes('.')) {
      used.add(ipToInt(node.data.ip));
    }
    for (const iface of node.data.interfaces ?? []) {
      if (iface.ipAddress?.includes('.')) used.add(ipToInt(iface.ipAddress));
    }
  }
  return used;
}

/**
 * Lowest free host address in `network/prefix`, preferring `.10`+ (leaving room
 * for gateways), scanning upward and skipping the network/broadcast addresses.
 */
function nextFreeHost(network: string, prefix: number, nodes: readonly NetlabNode[]): string {
  const used = usedIps(nodes);
  const net = ipToInt(network);
  const hostBits = 32 - prefix;
  const size = hostBits >= 31 ? 0xffffffff : (1 << hostBits) - 1;
  const broadcast = (net + size) >>> 0;
  const preferred = (net + 10) >>> 0;
  const start = preferred <= broadcast - 1 ? preferred : (net + 1) >>> 0;
  for (let candidate = start; candidate <= broadcast - 1; candidate += 1) {
    if (candidate <= net) continue;
    if (!used.has(candidate >>> 0)) return intToIp(candidate >>> 0);
  }
  // Subnet exhausted from the preferred point — fall back to network + 1.
  return intToIp((net + 1) >>> 0);
}

/** Default subnet when no peer address exists to anchor one. */
const DEFAULT_SUBNET = { network: '192.168.1.0', prefix: 24 };

export function suggestFix(code: FixableCode, ctx: FixContext): ConnectionFix[] {
  const { edge, nodes } = ctx;
  const source = findNode(nodes, edge.source);
  const target = findNode(nodes, edge.target);

  switch (code) {
    case 'endpoint-to-endpoint':
      return [
        {
          label: 'insert switch between',
          patch: {
            kind: 'insert-switch',
            edgeId: edge.id,
            sourceId: edge.source,
            targetId: edge.target,
          },
        },
        { label: 'open link', ghost: true },
      ];

    case 'self-loop':
    case 'duplicate-edge':
      return [{ label: 'delete edge', patch: { kind: 'remove-edge', edgeId: edge.id } }];

    case 'interface-in-use':
      // No safe auto-fix — focus the link so the author can re-pick a handle.
      return [{ label: 'open link', ghost: true }];

    case 'missing-ip': {
      // The offending node is whichever endpoint needs an IP but has none.
      const node = [source, target].find(
        (n) => n && IP_REQUIRED_ROLES.has(n.data.role) && !nodeHasIp(n),
      );
      if (!node) return [{ label: 'open ifaces', ghost: true }];
      const peer = node.id === source?.id ? target : source;
      const peerCidr = anyCidr(peer);
      const prefix = peerCidr?.prefix ?? DEFAULT_SUBNET.prefix;
      const network = peerCidr ? networkAddress(peerCidr.ip, prefix) : DEFAULT_SUBNET.network;
      const ip = nextFreeHost(network, prefix, nodes);
      const patch: TopologyPatch =
        node.data.role === 'router'
          ? {
              kind: 'assign-ip',
              nodeId: node.id,
              ...(ifaceForEdge(node, edge.id)?.id
                ? { interfaceId: ifaceForEdge(node, edge.id)!.id }
                : {}),
              ip,
              prefix,
            }
          : { kind: 'assign-ip', nodeId: node.id, ip, prefix };
      return [
        { label: `auto-assign ${ip}/${prefix}`, patch },
        { label: 'open ifaces', ghost: true },
      ];
    }

    case 'subnet-mismatch': {
      // Align the target router's edge interface to the source's subnet.
      const sourceIface = ifaceForEdge(source, edge.id);
      const targetIface = ifaceForEdge(target, edge.id);
      if (!source || !target || !sourceIface?.ipAddress || !targetIface) {
        return [{ label: 'open link', ghost: true }];
      }
      const prefix = sourceIface.prefixLength;
      const network = networkAddress(sourceIface.ipAddress, prefix);
      const ip = nextFreeHost(network, prefix, nodes);
      return [
        {
          label: `align ${targetIface.name} → ${ip}/${prefix}`,
          patch: {
            kind: 'align-subnet',
            nodeId: target.id,
            interfaceId: targetIface.id,
            ip,
            prefix,
          },
        },
        { label: 'open link', ghost: true },
      ];
    }

    default:
      return [];
  }
}

// ─── Pure patch application (single undoable commit) ────────────────────────

let switchSeq = 0;

function assignNodeIp(
  node: NetlabNode,
  ip: string,
  prefix: number,
  interfaceId: string | undefined,
): NetlabNode {
  if (node.data.role === 'router') {
    const interfaces = node.data.interfaces ?? [];
    const targetId = interfaceId ?? interfaces[0]?.id;
    const nextInterfaces = interfaces.map((iface) =>
      iface.id === targetId ? { ...iface, ipAddress: ip, prefixLength: prefix } : iface,
    );
    return { ...node, data: { ...node.data, interfaces: nextInterfaces } };
  }
  return { ...node, data: { ...node.data, ip } };
}

/**
 * Apply a {@link TopologyPatch} to a topology snapshot, returning a new
 * snapshot. Pure — the editor commits the result as one history entry so a
 * single undo reverts the whole fix, and re-running `validateTopology` proves
 * the issue is resolved.
 */
export function applyTopologyPatch<T extends Pick<TopologySnapshot, 'nodes' | 'edges'>>(
  patch: TopologyPatch,
  topology: T,
): T {
  switch (patch.kind) {
    case 'remove-edge':
      return { ...topology, edges: topology.edges.filter((e) => e.id !== patch.edgeId) };

    case 'assign-ip':
    case 'align-subnet': {
      const interfaceId = 'interfaceId' in patch ? patch.interfaceId : undefined;
      return {
        ...topology,
        nodes: topology.nodes.map((node) =>
          node.id === patch.nodeId ? assignNodeIp(node, patch.ip, patch.prefix, interfaceId) : node,
        ),
      };
    }

    case 'insert-switch': {
      const edge = topology.edges.find((e) => e.id === patch.edgeId);
      if (!edge) return topology;
      switchSeq += 1;
      const switchId = `switch-fix-${Date.now().toString(36)}-${switchSeq}`;
      const source = topology.nodes.find((n) => n.id === patch.sourceId);
      const target = topology.nodes.find((n) => n.id === patch.targetId);
      const midX = source && target ? (source.position.x + target.position.x) / 2 : 200;
      const midY = source && target ? (source.position.y + target.position.y) / 2 : 200;
      const switchNode: NetlabNode = {
        id: switchId,
        type: 'switch',
        position: { x: midX, y: midY },
        data: {
          label: switchId,
          layerId: 'l2',
          role: 'switch',
          ports: [
            { id: `${switchId}-p0`, name: 'fa0/0', macAddress: '02:00:00:00:00:00' },
            { id: `${switchId}-p1`, name: 'fa0/1', macAddress: '02:00:00:00:00:01' },
          ],
        },
      };
      const edges = topology.edges.filter((e) => e.id !== patch.edgeId);
      edges.push(
        { id: `${patch.edgeId}-a`, source: patch.sourceId, target: switchId },
        { id: `${patch.edgeId}-b`, source: switchId, target: patch.targetId },
      );
      return { ...topology, nodes: [...topology.nodes, switchNode], edges };
    }

    default:
      return topology;
  }
}
