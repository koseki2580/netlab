import { NetlabError, type NetlabErrorCode } from '../../errors';
import { transition } from '../../layers/l4-transport/TcpStateMachine';
import type { IpPacket } from '../../types/packets';
import type { RouteEntry } from '../../types/routing';
import type { SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import type { TcpEvent, TcpState } from '../../types/tcp';
import { isInSubnet, prefixLength } from '../../utils/cidr';
import { buildTransportBytes } from '../../utils/packetLayout';

export interface TcpStateTransition {
  readonly from: TcpState;
  readonly event: TcpEvent;
  readonly to: TcpState;
}

function fail(code: NetlabErrorCode, message: string, context: Record<string, unknown>): never {
  throw new NetlabError({ code, message: `[netlab] ${message}`, context });
}

function nodeInterfacePairs(node: NetworkTopology['nodes'][number]): Map<string, string> {
  const pairs = new Map<string, string>();
  if (node.data.ip && node.data.mac) {
    pairs.set(node.data.ip, node.data.mac);
  }
  for (const iface of node.data.interfaces ?? []) {
    pairs.set(iface.ipAddress, iface.macAddress);
    for (const subInterface of iface.subInterfaces ?? []) {
      pairs.set(subInterface.ipAddress, iface.macAddress);
    }
  }
  return pairs;
}

function neighborsFor(nodeId: string, topology: NetworkTopology): NetworkTopology['nodes'] {
  const ids = new Set<string>();
  for (const edge of topology.edges) {
    if (edge.source === nodeId) {
      ids.add(edge.target);
    }
    if (edge.target === nodeId) {
      ids.add(edge.source);
    }
  }
  return topology.nodes.filter((node) => ids.has(node.id));
}

/**
 * Oracle for `src/simulation/__properties__/arp.property.test.ts`.
 */
export function arpTableMatchesTopology(state: SimulationState, topology: NetworkTopology): void {
  for (const [nodeId, table] of Object.entries(state.nodeArpTables)) {
    const allowed = new Map<string, string>();
    for (const neighbor of neighborsFor(nodeId, topology)) {
      for (const [ip, mac] of nodeInterfacePairs(neighbor)) {
        allowed.set(ip, mac);
      }
    }

    for (const [ip, mac] of Object.entries(table)) {
      if (allowed.get(ip) !== mac) {
        fail('property/arp-table-violation', 'ARP table entry is not reachable from topology', {
          nodeId,
          ip,
          mac,
        });
      }
    }
  }
}

function packetPayloadBytes(packet: IpPacket): number[] {
  return buildTransportBytes(packet.payload);
}

/**
 * Oracle for `src/simulation/__properties__/fragmentation.property.test.ts`.
 */
export function fragmentsReassembleToOriginal(
  originalPayload: Uint8Array,
  fragments: readonly IpPacket[],
): void {
  const actual = fragments
    .slice()
    .sort((left, right) => (left.fragmentOffset ?? 0) - (right.fragmentOffset ?? 0))
    .flatMap(packetPayloadBytes);
  const expected = Array.from(originalPayload);

  if (actual.length !== expected.length || actual.some((byte, index) => byte !== expected[index])) {
    fail(
      'property/fragment-reassembly-violation',
      'Fragments do not reassemble to original payload',
      {
        expectedLength: expected.length,
        actualLength: actual.length,
      },
    );
  }
}

/**
 * Oracle for `src/simulation/__properties__/routing.property.test.ts`.
 */
export function routeDecisionIsLongestPrefix(
  table: readonly RouteEntry[],
  dst: string,
  chosen: RouteEntry,
): void {
  const expected = table
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => isInSubnet(dst, route.destination))
    .sort((left, right) => {
      const prefixDelta =
        prefixLength(right.route.destination) - prefixLength(left.route.destination);
      if (prefixDelta !== 0) return prefixDelta;
      const metricDelta = left.route.metric - right.route.metric;
      if (metricDelta !== 0) return metricDelta;
      return left.index - right.index;
    })[0]?.route;

  if (
    !expected ||
    expected.destination !== chosen.destination ||
    expected.nextHop !== chosen.nextHop
  ) {
    fail('property/route-decision-violation', 'Route decision is not longest-prefix match', {
      dst,
      chosen,
      expected,
    });
  }
}

class UnionFind {
  private readonly parent = new Map<string, string>();

  constructor(ids: readonly string[]) {
    for (const id of ids) {
      this.parent.set(id, id);
    }
  }

  find(id: string): string {
    const parent = this.parent.get(id);
    if (!parent || parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(left: string, right: string): boolean {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) return false;
    this.parent.set(leftRoot, rightRoot);
    return true;
  }
}

/**
 * Oracle for `src/simulation/__properties__/stp.property.test.ts`.
 */
export function stpGraphIsTree(activeEdges: ReadonlySet<string>, topology: NetworkTopology): void {
  const switchIds = topology.nodes
    .filter((node) => node.data.role === 'switch')
    .map((node) => node.id);
  if (switchIds.length <= 1) return;

  const uf = new UnionFind(switchIds);
  let activeCount = 0;

  for (const edge of topology.edges) {
    if (!activeEdges.has(edge.id)) continue;
    const sourceIsSwitch = switchIds.includes(edge.source);
    const targetIsSwitch = switchIds.includes(edge.target);
    if (!sourceIsSwitch || !targetIsSwitch) continue;
    activeCount += 1;
    if (!uf.union(edge.source, edge.target)) {
      fail('property/stp-tree-violation', 'STP active graph is not a tree', {
        reason: 'cycle',
        edgeId: edge.id,
      });
    }
  }

  const root = uf.find(switchIds[0] ?? '');
  const connected = switchIds.every((id) => uf.find(id) === root);
  if (!connected || activeCount !== switchIds.length - 1) {
    fail('property/stp-tree-violation', 'STP active graph is not a tree', {
      reason: connected ? 'wrong-edge-count' : 'disconnected',
      activeCount,
      switchCount: switchIds.length,
    });
  }
}

/**
 * Oracle for `src/simulation/__properties__/tcp-handshake.property.test.ts`.
 */
export function tcpStateReachable(log: readonly TcpStateTransition[]): void {
  for (const item of log) {
    const result = transition(item.from, item.event);
    if (result.action.type === 'ERROR' || result.newState !== item.to) {
      fail('property/tcp-state-violation', 'TCP transition is not reachable', {
        from: item.from,
        event: item.event,
        to: item.to,
        expected: result.newState,
      });
    }
  }
}
