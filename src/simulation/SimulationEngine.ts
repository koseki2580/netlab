import { layerRegistry } from '../registry/LayerRegistry';
import { AclProcessor } from '../layers/l3-network/AclProcessor';
import { NatProcessor } from '../layers/l3-network/NatProcessor';
import { isInSubnet, prefixLength } from '../utils/cidr';
import { computeFcs, computeIpv4Checksum } from '../utils/checksum';
import { buildEthernetFrameBytes, buildIpv4HeaderBytes } from '../utils/packetLayout';
import { buildPcap, type PcapRecord } from '../utils/pcapSerializer';
import type { HookEngine } from '../hooks/HookEngine';
import type { ConnTrackTable } from '../types/acl';
import type { NatTable } from '../types/nat';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import type {
  ArpEthernetFrame,
  DhcpMessage,
  DnsMessage,
  HttpMessage,
  InFlightPacket,
  IpPacket,
  UdpDatagram,
} from '../types/packets';
import type { RouteEntry, RouterInterface } from '../types/routing';
import type {
  PacketHop,
  PacketTrace,
  SimulationState,
  RoutingDecision,
  RoutingCandidate,
  NatTranslation,
} from '../types/simulation';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import { type FailureState, EMPTY_FAILURE_STATE, makeInterfaceFailureId } from '../types/failure';
import { buildDiscover, handleAck, handleOffer } from '../services/DhcpClient';
import { handleDiscover, handleRequest, LeaseAllocator } from '../services/DhcpServer';
import { buildDnsQuery, handleDnsResponse } from '../services/DnsClient';
import { handleDnsQuery } from '../services/DnsServer';
import { deriveDeterministicMac, extractHostname, isIpAddress } from '../utils/network';

const MAX_HOPS = 64;
const DEFAULT_PLAY_INTERVAL_MS = 500;
const BROADCAST_IP = '255.255.255.255';

function isUdpDatagram(payload: IpPacket['payload']): payload is UdpDatagram {
  return !('seq' in payload);
}

function isDhcpPayload(payload: UdpDatagram['payload']): payload is DhcpMessage {
  return payload.layer === 'L7' && 'messageType' in payload;
}

function isDnsPayload(payload: UdpDatagram['payload']): payload is DnsMessage {
  return payload.layer === 'L7' && 'questions' in payload;
}

function isHttpPayload(payload: IpPacket['payload']): payload is IpPacket['payload'] & { payload: HttpMessage } {
  return 'seq' in payload && payload.payload.layer === 'L7' && 'headers' in payload.payload;
}

function getDhcpMessage(packet: InFlightPacket): DhcpMessage | null {
  const transport = packet.frame.payload.payload;
  return isUdpDatagram(transport) && isDhcpPayload(transport.payload) ? transport.payload : null;
}

function protocolName(num: number): string {
  if (num === 1) return 'ICMP';
  if (num === 6) return 'TCP';
  if (num === 17) return 'UDP';
  return String(num);
}

function buildRoutingDecision(dstIp: string, routes: RouteEntry[]): RoutingDecision {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  let winnerRoute: RouteEntry | null = null;
  const candidates: RoutingCandidate[] = sorted.map((r) => {
    const matched = isInSubnet(dstIp, r.destination);
    if (matched && winnerRoute === null) winnerRoute = r;
    return {
      destination: r.destination,
      nextHop: r.nextHop,
      metric: r.metric,
      protocol: r.protocol,
      adminDistance: r.adminDistance,
      matched,
      selectedByLpm: false,
    };
  });
  if (winnerRoute !== null) {
    const idx = candidates.findIndex(
      (c) =>
        c.destination === (winnerRoute as RouteEntry).destination &&
        c.nextHop === (winnerRoute as RouteEntry).nextHop,
    );
    if (idx >= 0) candidates[idx].selectedByLpm = true;
  }
  const winner = candidates.find((c) => c.selectedByLpm) ?? null;
  const explanation = winner
    ? `Matched ${winner.destination} via ${winner.nextHop} (${winner.protocol}, AD=${winner.adminDistance})`
    : `No matching route for ${dstIp} — packet will be dropped`;
  return { dstIp, candidates, winner, explanation };
}

function bestRoute(dstIp: string, routes: RouteEntry[]): RouteEntry | null {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  return sorted.find((r) => isInSubnet(dstIp, r.destination)) ?? null;
}

interface Neighbor {
  nodeId: string;
  edgeId: string;
}

interface ResolvedInterface {
  id: string;
  name: string;
}

interface ArpTargetInfo {
  targetIp: string;
  targetNodeId: string;
  senderIp: string;
  senderMac: string;
}

const INITIAL_STATE: SimulationState = {
  status: 'idle',
  traces: [],
  currentTraceId: null,
  currentStep: -1,
  activeEdgeIds: [],
  selectedHop: null,
  selectedPacket: null,
  nodeArpTables: {},
  natTables: [],
  connTrackTables: [],
};

export class SimulationEngine {
  private state: SimulationState = { ...INITIAL_STATE };
  private listeners = new Set<(state: SimulationState) => void>();
  private playTimer: ReturnType<typeof setInterval> | null = null;
  // packetSnapshots[traceId][step] = InFlightPacket snapshot at that hop
  private packetSnapshots = new Map<string, InFlightPacket[]>();
  private runtimeNodeIps = new Map<string, string>();
  private dhcpLeaseStates = new Map<string, DhcpLeaseState>();
  private dnsCaches = new Map<string, DnsCache>();
  private natProcessors = new Map<string, NatProcessor>();
  private aclProcessors = new Map<string, AclProcessor>();

  constructor(
    private readonly topology: NetworkTopology,
    private readonly hookEngine: HookEngine,
  ) {}

  getState(): SimulationState {
    return this.serializeState();
  }

  subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.serializeState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  // ── Topology helpers ───────────────────────────────────────────────────────

  private getNeighbors(
    nodeId: string,
    excludeNodeId: string | null = null,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Neighbor[] {
    const result: Neighbor[] = [];
    for (const edge of this.topology.edges) {
      if (failureState.downEdgeIds.has(edge.id)) continue;
      if (edge.source === nodeId && edge.target !== excludeNodeId) {
        result.push({ nodeId: edge.target, edgeId: edge.id });
      } else if (edge.target === nodeId && edge.source !== excludeNodeId) {
        result.push({ nodeId: edge.source, edgeId: edge.id });
      }
    }
    return result;
  }

  private resolveEgressInterface(
    nodeId: string,
    dstIp: string,
  ): ResolvedInterface | null {
    const node = this.topology.nodes.find((n) => n.id === nodeId);
    if (!node || node.data.role !== 'router') return null;

    const routes = this.topology.routeTables.get(nodeId) ?? [];
    const route = bestRoute(dstIp, routes);
    if (!route) return null;

    const targetIp = route.nextHop === 'direct' ? dstIp : route.nextHop;
    const match = node.data.interfaces?.find((iface) =>
      isInSubnet(targetIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return match ? { id: match.id, name: match.name } : null;
  }

  private resolveIngressInterface(
    nodeId: string,
    senderIp: string,
  ): ResolvedInterface | null {
    const node = this.topology.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const match = node.data.interfaces?.find((iface) =>
      isInSubnet(senderIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return match ? { id: match.id, name: match.name } : null;
  }

  private resolvePortFromEdge(
    nodeId: string,
    edgeId: string,
    direction: 'ingress' | 'egress',
  ): ResolvedInterface | null {
    if (!edgeId) return null;

    const edge = this.topology.edges.find((candidate) => candidate.id === edgeId);
    if (!edge) return null;

    const handleId =
      direction === 'egress'
        ? edge.source === nodeId
          ? edge.sourceHandle
          : edge.target === nodeId
            ? edge.targetHandle
            : undefined
        : edge.target === nodeId
          ? edge.targetHandle
          : edge.source === nodeId
            ? edge.sourceHandle
            : undefined;

    if (!handleId) return null;

    const node = this.topology.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return null;

    const iface = node.data.interfaces?.find((candidate) => candidate.id === handleId);
    const port = node.data.ports?.find((candidate) => candidate.id === handleId);
    const resolved = iface ?? port;

    return resolved ? { id: resolved.id, name: resolved.name } : null;
  }

  private resolveNextNode(
    currentNodeId: string,
    packet: InFlightPacket,
    ingressNodeId: string | null,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Neighbor | null {
    const neighbors = this.getNeighbors(currentNodeId, ingressNodeId, failureState);
    const node = this.topology.nodes.find((n) => n.id === currentNodeId);
    if (!node) return null;
    const dstIp = packet.frame.payload.dstIp;

    if (node.data.role === 'router') {
      const routes = this.topology.routeTables.get(currentNodeId) ?? [];
      const route = bestRoute(dstIp, routes);
      if (!route) return null;

      if (route.nextHop === 'direct') {
        // Find neighbor that is the exact destination, or a switch (transparent pass-through)
        for (const neighbor of neighbors) {
          const neighborNode = this.topology.nodes.find((n) => n.id === neighbor.nodeId);
          if (!neighborNode) continue;
          if (this.getEffectiveNodeIp(neighborNode) === dstIp) return neighbor;
          if ((neighborNode.data.interfaces ?? []).some((iface) => iface.ipAddress === dstIp)) {
            return neighbor;
          }
          if (neighborNode.data.role === 'switch') return neighbor;
        }
        return null;
      }

      // nextHop is an IP: find neighbor router whose interface has that IP, or a switch
      for (const neighbor of neighbors) {
        const neighborNode = this.topology.nodes.find((n) => n.id === neighbor.nodeId);
        if (!neighborNode) continue;
        const ifaces = (neighborNode.data.interfaces ?? []) as Array<{ ipAddress: string }>;
        if (ifaces.some((i) => i.ipAddress === route.nextHop)) return neighbor;
        if (neighborNode.data.role === 'switch') return neighbor;
      }
      return null;
    }

    if (node.data.role === 'switch') {
      const targetIp = dstIp === BROADCAST_IP ? null : dstIp;

      for (const neighbor of neighbors) {
        const neighborNode = this.findNode(neighbor.nodeId);
        if (!neighborNode) continue;

        if (neighborNode.data.role === 'switch') {
          const matched = this.findMatchingNodeThroughSwitches(
            neighborNode.id,
            currentNodeId,
            targetIp,
            packet.dstNodeId,
            failureState,
          );
          if (matched && (!packet.dstNodeId || matched.id === packet.dstNodeId)) {
            return neighbor;
          }
          continue;
        }

        if (packet.dstNodeId && neighborNode.id === packet.dstNodeId) {
          return neighbor;
        }

        if (
          targetIp &&
          (
            this.getEffectiveNodeIp(neighborNode) === targetIp ||
            (neighborNode.data.interfaces ?? []).some((iface) => iface.ipAddress === targetIp)
          )
        ) {
          return neighbor;
        }
      }

      return neighbors[0] ?? null;
    }

    // Source endpoints forward to their first connected neighbor
    // (non-source endpoints never forward — packet should have been delivered)
    if (ingressNodeId === null) {
      return neighbors[0] ?? null;
    }

    return null;
  }

  private findNode(nodeId: string) {
    return this.topology.nodes.find((candidate) => candidate.id === nodeId) ?? null;
  }

  private serializeNatTables(): NatTable[] {
    return Array.from(this.natProcessors.values()).map((processor) => processor.getTable());
  }

  private serializeConnTrackTables(): ConnTrackTable[] {
    return Array.from(this.aclProcessors.entries()).flatMap(([routerId, processor]) => {
      const node = this.findNode(routerId);
      if (!node || node.data.role !== 'router' || node.data.statefulFirewall !== true) {
        return [];
      }
      return [processor.getConnTrackTable()];
    });
  }

  private serializeState(): SimulationState {
    return {
      ...this.state,
      natTables: this.serializeNatTables(),
      connTrackTables: this.serializeConnTrackTables(),
    };
  }

  private getNatProcessor(routerId: string): NatProcessor | null {
    const node = this.findNode(routerId);
    if (!node || node.data.role !== 'router') return null;

    const interfaces = node.data.interfaces ?? [];
    const hasInside = interfaces.some((iface) => iface.nat === 'inside');
    const hasOutside = interfaces.some((iface) => iface.nat === 'outside');
    if (!hasInside || !hasOutside) return null;

    if (!this.natProcessors.has(routerId)) {
      this.natProcessors.set(routerId, new NatProcessor(routerId, this.topology));
    }

    return this.natProcessors.get(routerId) ?? null;
  }

  private getAclProcessor(routerId: string): AclProcessor | null {
    const node = this.findNode(routerId);
    if (!node || node.data.role !== 'router') return null;

    const interfaces = node.data.interfaces ?? [];
    const hasAcl = interfaces.some(
      (iface) => iface.inboundAcl !== undefined || iface.outboundAcl !== undefined,
    );
    if (!hasAcl) return null;

    if (!this.aclProcessors.has(routerId)) {
      this.aclProcessors.set(routerId, new AclProcessor(routerId, this.topology));
    }

    return this.aclProcessors.get(routerId) ?? null;
  }

  private isPlaceholderMac(mac: string): boolean {
    const normalized = mac.trim().toLowerCase();
    return (
      normalized === '00:00:00:00:00:00' ||
      normalized === '00:00:00:00:00:01' ||
      normalized === '00:00:00:00:00:02'
    );
  }

  private hashString(value: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  private derivePacketIdentification(packetId: string): number {
    return this.hashString(packetId) & 0xffff;
  }

  private resolveEndpointMac(nodeId: string): string | null {
    const node = this.findNode(nodeId);
    if (!node || (node.data.role !== 'client' && node.data.role !== 'server')) {
      return null;
    }

    return typeof node.data.mac === 'string' && node.data.mac.length > 0 && !this.isPlaceholderMac(node.data.mac)
      ? node.data.mac
      : deriveDeterministicMac(nodeId);
  }

  private getEffectiveNodeIp(node: NetlabNode | null): string | undefined {
    if (!node) return undefined;
    return this.runtimeNodeIps.get(node.id) ?? node.data.ip;
  }

  private nodeOwnsIp(node: NetlabNode, ip: string): boolean {
    if (this.getEffectiveNodeIp(node) === ip) return true;
    return (node.data.interfaces ?? []).some((iface) => iface.ipAddress === ip);
  }

  private findMatchingNodeThroughSwitches(
    switchNodeId: string,
    sourceNodeId: string,
    targetIp: string | null,
    targetNodeId: string | undefined,
    failureState: FailureState,
    visited = new Set<string>(),
  ): NetlabNode | null {
    if (visited.has(switchNodeId)) return null;
    visited.add(switchNodeId);

    const neighbors = this.getNeighbors(switchNodeId, sourceNodeId, failureState);
    const switchNeighbors = [];

    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node) continue;

      if (node.data.role === 'switch') {
        switchNeighbors.push(node.id);
        continue;
      }

      const interfaces = node.data.interfaces ?? [];
      const matchesTarget =
        (targetNodeId !== undefined && node.id === targetNodeId) ||
        (targetIp !== null && (
          this.getEffectiveNodeIp(node) === targetIp ||
          interfaces.some((iface) => iface.ipAddress === targetIp)
        ));

      if (matchesTarget) {
        return node;
      }
    }

    for (const neighborId of switchNeighbors) {
      const match = this.findMatchingNodeThroughSwitches(
        neighborId,
        switchNodeId,
        targetIp,
        targetNodeId,
        failureState,
        visited,
      );
      if (match) return match;
    }

    return null;
  }

  private findFirstNonSwitchNode(
    switchNodeId: string,
    sourceNodeId: string,
    failureState: FailureState,
    visited = new Set<string>(),
  ): NetlabNode | null {
    if (visited.has(switchNodeId)) return null;
    visited.add(switchNodeId);

    const neighbors = this.getNeighbors(switchNodeId, sourceNodeId, failureState);
    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node) continue;
      if (node.data.role !== 'switch') {
        return node;
      }
    }

    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node || node.data.role !== 'switch') continue;

      const match = this.findFirstNonSwitchNode(
        node.id,
        switchNodeId,
        failureState,
        visited,
      );
      if (match) return match;
    }

    return null;
  }

  private resolveEffectiveLayer2Destination(
    currentNodeId: string,
    nextNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
  ): NetlabNode | null {
    const nextNode = this.findNode(nextNodeId);
    if (!nextNode) return null;
    if (nextNode.data.role !== 'switch') {
      return nextNode;
    }

    const currentNode = this.findNode(currentNodeId);
    if (!currentNode) return null;

    let targetIp: string | null = packet.frame.payload.dstIp;
    let targetNodeId: string | undefined = packet.dstNodeId;

    if (currentNode.data.role === 'router') {
      const route = bestRoute(
        packet.frame.payload.dstIp,
        this.topology.routeTables.get(currentNodeId) ?? [],
      );
      if (route?.nextHop && route.nextHop !== 'direct') {
        targetIp = route.nextHop;
        targetNodeId = undefined;
      }
    }

    return (
      this.findMatchingNodeThroughSwitches(
        nextNodeId,
        currentNodeId,
        targetIp,
        targetNodeId,
        failureState,
      ) ??
      this.findFirstNonSwitchNode(nextNodeId, currentNodeId, failureState)
    );
  }

  private resolveRouterMac(
    currentNodeId: string,
    routerNodeId: string,
    packet: InFlightPacket,
    egressInterfaceId?: string,
  ): string | null {
    const routerNode = this.findNode(routerNodeId);
    if (!routerNode || routerNode.data.role !== 'router') return null;

    const routerInterfaces = routerNode.data.interfaces ?? [];
    const currentNode = this.findNode(currentNodeId);

    if (currentNode?.data.role === 'router') {
      const route = bestRoute(
        packet.frame.payload.dstIp,
        this.topology.routeTables.get(currentNodeId) ?? [],
      );
      if (route?.nextHop && route.nextHop !== 'direct') {
        const nextHopInterface = routerInterfaces.find((iface) => iface.ipAddress === route.nextHop);
        if (nextHopInterface) return nextHopInterface.macAddress;
      }

      const egressInterface = currentNode.data.interfaces?.find(
        (iface) => iface.id === egressInterfaceId,
      );
      if (egressInterface) {
        const subnetInterface = routerInterfaces.find((iface) =>
          isInSubnet(
            iface.ipAddress,
            `${egressInterface.ipAddress}/${egressInterface.prefixLength}`,
          ),
        );
        if (subnetInterface) return subnetInterface.macAddress;
      }
    }

    const sourceIp = packet.frame.payload.srcIp;
    const ingressFacingInterface = routerInterfaces.find((iface) =>
      isInSubnet(sourceIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return ingressFacingInterface?.macAddress ?? routerInterfaces[0]?.macAddress ?? null;
  }

  private resolveDstMac(
    currentNodeId: string,
    nextNodeId: string,
    egressInterfaceId: string | undefined,
    packet: InFlightPacket,
    failureState: FailureState,
  ): string | null {
    const destinationNode = this.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
    );

    if (!destinationNode) return null;

    if (destinationNode.data.role === 'router') {
      return (
        this.resolveRouterMac(currentNodeId, destinationNode.id, packet, egressInterfaceId) ??
        deriveDeterministicMac(destinationNode.id)
      );
    }

    if (destinationNode.data.role === 'client' || destinationNode.data.role === 'server') {
      return this.resolveEndpointMac(destinationNode.id);
    }

    return null;
  }

  private resolveArpTargetInfo(
    currentNodeId: string,
    nextNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    egressInterfaceId?: string,
    edgeId?: string,
  ): ArpTargetInfo | null {
    const currentNode = this.findNode(currentNodeId);
    if (!currentNode) return null;
    if (packet.frame.payload.dstIp === BROADCAST_IP) return null;

    if (currentNode.data.role === 'router') {
      const routes = this.topology.routeTables.get(currentNodeId) ?? [];
      const route = bestRoute(packet.frame.payload.dstIp, routes);
      if (!route) return null;

      const targetIp = route.nextHop === 'direct' ? packet.frame.payload.dstIp : route.nextHop;
      if (!targetIp) return null;

      const targetNode = this.resolveEffectiveLayer2Destination(
        currentNodeId,
        nextNodeId,
        packet,
        failureState,
      );
      if (!targetNode || !this.nodeOwnsIp(targetNode, targetIp)) return null;

      const egressInterface =
        currentNode.data.interfaces?.find((iface) => iface.id === egressInterfaceId) ??
        (() => {
          const fallback = this.resolvePortFromEdge(currentNodeId, edgeId ?? '', 'egress');
          return currentNode.data.interfaces?.find((iface) => iface.id === fallback?.id);
        })();

      return {
        targetIp,
        targetNodeId: targetNode.id,
        senderIp: egressInterface?.ipAddress ?? '',
        senderMac: egressInterface?.macAddress ?? deriveDeterministicMac(currentNodeId),
      };
    }

    if (currentNode.data.role !== 'client' && currentNode.data.role !== 'server') {
      return null;
    }

    const targetNode = this.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
    );
    if (!targetNode) return null;

    const senderIp = this.getEffectiveNodeIp(currentNode) ?? '';
    let targetIp = '';

    if (targetNode.data.role === 'router') {
      const gatewayInterface = ((targetNode.data.interfaces ?? []) as RouterInterface[]).find((iface) =>
        senderIp.length > 0 && isInSubnet(senderIp, `${iface.ipAddress}/${iface.prefixLength}`),
      );
      targetIp = gatewayInterface?.ipAddress ?? '';
    } else if (targetNode.data.role === 'client' || targetNode.data.role === 'server') {
      targetIp = this.getEffectiveNodeIp(targetNode) ?? '';
    }

    if (!targetIp || !this.nodeOwnsIp(targetNode, targetIp)) return null;

    return {
      targetIp,
      targetNodeId: targetNode.id,
      senderIp,
      senderMac: this.resolveEndpointMac(currentNodeId) ?? deriveDeterministicMac(currentNodeId),
    };
  }

  private resolveArpTargetMac(
    currentNodeId: string,
    nextNodeId: string,
    targetNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    egressInterfaceId?: string,
  ): string {
    const resolvedMac = this.resolveDstMac(
      currentNodeId,
      nextNodeId,
      egressInterfaceId,
      packet,
      failureState,
    );
    if (resolvedMac) return resolvedMac;

    const targetNode = this.findNode(targetNodeId);
    if (targetNode?.data.role === 'router') {
      return (
        this.resolveRouterMac(currentNodeId, targetNodeId, packet, egressInterfaceId) ??
        deriveDeterministicMac(targetNodeId)
      );
    }

    return this.resolveEndpointMac(targetNodeId) ?? deriveDeterministicMac(targetNodeId);
  }

  private seedArpCache(cache: Map<string, string>): void {
    for (const node of this.topology.nodes) {
      for (const iface of (node.data.interfaces ?? []) as RouterInterface[]) {
        if (iface.ipAddress && iface.macAddress && !this.isPlaceholderMac(iface.macAddress)) {
          cache.set(iface.ipAddress, iface.macAddress);
        }
      }

      const effectiveIp = this.getEffectiveNodeIp(node);
      if (
        typeof effectiveIp === 'string' &&
        effectiveIp &&
        typeof node.data.mac === 'string' &&
        node.data.mac &&
        !this.isPlaceholderMac(node.data.mac)
      ) {
        cache.set(effectiveIp, node.data.mac);
      }
    }
  }

  private appendHop(
    hops: PacketHop[],
    snapshots: InFlightPacket[],
    hop: Omit<PacketHop, 'step'>,
    snapshot: InFlightPacket,
    stepCounter: number,
  ): number {
    snapshots.push({ ...snapshot });
    hops.push({ ...hop, step: stepCounter });
    return stepCounter + 1;
  }

  private recordArpEntry(
    nodeArpTables: Record<string, Record<string, string>>,
    nodeId: string,
    ip: string,
    mac: string,
  ): void {
    if (!ip.trim() || !mac.trim()) return;
    nodeArpTables[nodeId] ??= {};
    nodeArpTables[nodeId][ip] = mac;
  }

  private injectArpExchange(
    senderNodeId: string,
    targetNodeId: string,
    senderIp: string,
    targetIp: string,
    senderMac: string,
    targetMac: string,
    edgeId: string,
    workingPacket: InFlightPacket,
    stepCounter: number,
    hops: PacketHop[],
    snapshots: InFlightPacket[],
    baseTs: number,
  ): number {
    const senderNode = this.findNode(senderNodeId);
    const targetNode = this.findNode(targetNodeId);

    const arpRequestFrame: ArpEthernetFrame = {
      layer: 'L2',
      srcMac: senderMac,
      dstMac: 'ff:ff:ff:ff:ff:ff',
      etherType: 0x0806,
      payload: {
        layer: 'ARP',
        hardwareType: 1,
        protocolType: 0x0800,
        operation: 'request',
        senderMac,
        senderIp,
        targetMac: '00:00:00:00:00:00',
        targetIp,
      },
    };

    stepCounter = this.appendHop(
      hops,
      snapshots,
      {
        nodeId: senderNodeId,
        nodeLabel: senderNode?.data.label ?? senderNodeId,
        srcIp: senderIp,
        dstIp: targetIp,
        ttl: 0,
        protocol: 'ARP',
        event: 'arp-request',
        toNodeId: targetNodeId,
        activeEdgeId: edgeId,
        arpFrame: arpRequestFrame,
        timestamp: baseTs,
      },
      workingPacket,
      stepCounter,
    );

    const arpReplyFrame: ArpEthernetFrame = {
      layer: 'L2',
      srcMac: targetMac,
      dstMac: senderMac,
      etherType: 0x0806,
      payload: {
        layer: 'ARP',
        hardwareType: 1,
        protocolType: 0x0800,
        operation: 'reply',
        senderMac: targetMac,
        senderIp: targetIp,
        targetMac: senderMac,
        targetIp: senderIp,
      },
    };

    return this.appendHop(
      hops,
      snapshots,
      {
        nodeId: targetNodeId,
        nodeLabel: targetNode?.data.label ?? targetNodeId,
        srcIp: targetIp,
        dstIp: senderIp,
        ttl: 0,
        protocol: 'ARP',
        event: 'arp-reply',
        toNodeId: senderNodeId,
        activeEdgeId: edgeId,
        arpFrame: arpReplyFrame,
        timestamp: baseTs,
      },
      workingPacket,
      stepCounter,
    );
  }

  private withIpv4HeaderChecksum(packet: InFlightPacket): InFlightPacket {
    const ipPacket = packet.frame.payload;
    const checksum = computeIpv4Checksum(
      buildIpv4HeaderBytes(ipPacket, { checksumOverride: 0 }),
    );

    if (ipPacket.headerChecksum === checksum) {
      return packet;
    }

    return {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...ipPacket,
          headerChecksum: checksum,
        },
      },
    };
  }

  private withFrameFcs(packet: InFlightPacket): InFlightPacket {
    const fcs = computeFcs(
      buildEthernetFrameBytes(
        { ...packet.frame, fcs: 0 },
        { includePreamble: false, includeFcs: false },
      ),
    );

    if (packet.frame.fcs === fcs) {
      return packet;
    }

    return {
      ...packet,
      frame: {
        ...packet.frame,
        fcs,
      },
    };
  }

  private diffPacketFields(before: InFlightPacket, after: InFlightPacket): string[] {
    const changedFields: string[] = [];
    const beforeTransport = before.frame.payload.payload;
    const afterTransport = after.frame.payload.payload;

    if (before.frame.payload.ttl !== after.frame.payload.ttl) {
      changedFields.push('TTL');
    }
    if (before.frame.payload.headerChecksum !== after.frame.payload.headerChecksum) {
      changedFields.push('Header Checksum');
    }
    if (before.frame.payload.srcIp !== after.frame.payload.srcIp) {
      changedFields.push('Src IP');
    }
    if (before.frame.payload.dstIp !== after.frame.payload.dstIp) {
      changedFields.push('Dst IP');
    }
    if (beforeTransport.srcPort !== afterTransport.srcPort) {
      changedFields.push('Src Port');
    }
    if (beforeTransport.dstPort !== afterTransport.dstPort) {
      changedFields.push('Dst Port');
    }
    if (before.frame.srcMac !== after.frame.srcMac) {
      changedFields.push('Src MAC');
    }
    if (before.frame.dstMac !== after.frame.dstMac) {
      changedFields.push('Dst MAC');
    }
    if (before.frame.fcs !== after.frame.fcs) {
      changedFields.push('FCS');
    }

    return changedFields;
  }

  private materializePacket(
    packet: InFlightPacket,
    failureState: FailureState,
    arpCache: Map<string, string>,
  ): InFlightPacket {
    const currentNode = this.findNode(packet.currentDeviceId);
    const ipPacket = packet.frame.payload;
    let workingPacket: InFlightPacket = {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...ipPacket,
          identification: ipPacket.identification ?? this.derivePacketIdentification(packet.id),
        },
      },
    };

    const next = this.resolveNextNode(
      packet.currentDeviceId,
      workingPacket,
      null,
      failureState,
    );

    if (currentNode?.data.role === 'router' && next) {
      const egressInterface =
        this.resolveEgressInterface(packet.currentDeviceId, packet.frame.payload.dstIp) ??
        this.resolvePortFromEdge(packet.currentDeviceId, next.edgeId, 'egress');
      const srcMac = currentNode.data.interfaces?.find(
        (iface) => iface.id === egressInterface?.id,
      )?.macAddress;
      const arpTarget = this.resolveArpTargetInfo(
        packet.currentDeviceId,
        next.nodeId,
        workingPacket,
        failureState,
        egressInterface?.id,
        next.edgeId,
      );
      const dstMac = arpTarget
        ? (arpCache.get(arpTarget.targetIp) ?? null)
        : this.resolveDstMac(
            packet.currentDeviceId,
            next.nodeId,
            egressInterface?.id,
            workingPacket,
            failureState,
          );

      workingPacket = {
        ...workingPacket,
        frame: {
          ...workingPacket.frame,
          srcMac: srcMac ?? workingPacket.frame.srcMac,
          dstMac: dstMac ?? workingPacket.frame.dstMac,
        },
      };
    } else if (currentNode?.data.role === 'client' || currentNode?.data.role === 'server') {
      const resolvedSrcMac = this.resolveEndpointMac(currentNode.id);
      const arpTarget = next
        ? this.resolveArpTargetInfo(
            currentNode.id,
            next.nodeId,
            workingPacket,
            failureState,
            undefined,
            next.edgeId,
          )
        : null;
      const resolvedDstMac = next
        ? arpTarget
          ? (arpCache.get(arpTarget.targetIp) ?? null)
          : this.resolveDstMac(
              currentNode.id,
              next.nodeId,
              undefined,
              workingPacket,
              failureState,
            )
        : null;

      workingPacket = {
        ...workingPacket,
        frame: {
          ...workingPacket.frame,
          srcMac:
            resolvedSrcMac && this.isPlaceholderMac(workingPacket.frame.srcMac)
              ? resolvedSrcMac
              : workingPacket.frame.srcMac,
          dstMac:
            resolvedDstMac && this.isPlaceholderMac(workingPacket.frame.dstMac)
              ? resolvedDstMac
              : workingPacket.frame.dstMac,
        },
      };
    }

    return this.withFrameFcs(this.withIpv4HeaderChecksum(workingPacket));
  }

  private deriveTraceLabel(packet: InFlightPacket): string {
    const ipPayload = packet.frame.payload.payload;

    if (isHttpPayload(ipPayload)) {
      if (ipPayload.payload.method) {
        return `HTTP ${ipPayload.payload.method}`;
      }
      if (ipPayload.payload.statusCode != null) {
        return `HTTP ${ipPayload.payload.statusCode}`;
      }
      return 'HTTP';
    }

    if (isUdpDatagram(ipPayload)) {
      if (isDhcpPayload(ipPayload.payload)) {
        return `DHCP ${ipPayload.payload.messageType}`;
      }
      if (isDnsPayload(ipPayload.payload)) {
        return ipPayload.payload.isResponse ? 'DNS RESPONSE' : 'DNS QUERY';
      }
      return 'UDP';
    }

    return protocolName(packet.frame.payload.protocol);
  }

  private withPacketIps(
    packet: InFlightPacket,
    ips: { srcIp?: string; dstIp?: string },
  ): InFlightPacket {
    const srcIp = ips.srcIp ?? packet.frame.payload.srcIp;
    const dstIp = ips.dstIp ?? packet.frame.payload.dstIp;
    if (srcIp === packet.frame.payload.srcIp && dstIp === packet.frame.payload.dstIp) {
      return packet;
    }

    return {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...packet.frame.payload,
          srcIp,
          dstIp,
        },
      },
    };
  }

  // ── Core precomputation ────────────────────────────────────────────────────

  private async precomputeDetailed(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<{ trace: PacketTrace; nodeArpTables: Record<string, Record<string, string>> }> {
    const hops: PacketHop[] = [];
    const snapshots: InFlightPacket[] = [];
    const nodeArpTables: Record<string, Record<string, string>> = {};
    const visitedNodes = new Set<string>();
    const arpCache = new Map<string, string>();
    let current = packet.srcNodeId;
    let ingressFrom: string | null = null;
    let ingressEdgeId: string | null = null;
    let senderIp: string | null = null;
    let stepCounter = 0;
    this.seedArpCache(arpCache);
    let workingPacket: InFlightPacket = this.materializePacket(
      { ...packet, currentDeviceId: current },
      failureState,
      arpCache,
    );
    const baseTs = Date.now();

    for (let iter = 0; iter < MAX_HOPS; iter++) {
      // Loop guard
      if (visitedNodes.has(current)) {
        stepCounter = this.appendHop(hops, snapshots, {
          nodeId: current,
          nodeLabel: current,
          srcIp: workingPacket.frame.payload.srcIp,
          dstIp: workingPacket.frame.payload.dstIp,
          ttl: workingPacket.frame.payload.ttl,
          protocol: protocolName(workingPacket.frame.payload.protocol),
          event: 'drop',
          fromNodeId: ingressFrom ?? undefined,
          reason: 'routing-loop',
          timestamp: baseTs,
        }, workingPacket, stepCounter);
        break;
      }
      visitedNodes.add(current);

      const node = this.findNode(current);
      if (!node) {
        stepCounter = this.appendHop(hops, snapshots, {
          nodeId: current,
          nodeLabel: current,
          srcIp: workingPacket.frame.payload.srcIp,
          dstIp: workingPacket.frame.payload.dstIp,
          ttl: workingPacket.frame.payload.ttl,
          protocol: protocolName(workingPacket.frame.payload.protocol),
          event: 'drop',
          fromNodeId: ingressFrom ?? undefined,
          reason: 'node-not-found',
          timestamp: baseTs,
        }, workingPacket, stepCounter);
        break;
      }

      if (failureState.downNodeIds.has(current)) {
        stepCounter = this.appendHop(hops, snapshots, {
          nodeId: current,
          nodeLabel: node.data.label,
          srcIp: workingPacket.frame.payload.srcIp,
          dstIp: workingPacket.frame.payload.dstIp,
          ttl: workingPacket.frame.payload.ttl,
          protocol: protocolName(workingPacket.frame.payload.protocol),
          event: 'drop',
          fromNodeId: ingressFrom ?? undefined,
          reason: 'node-down',
          timestamp: baseTs,
        }, workingPacket, stepCounter);
        break;
      }

      const ipPacket = workingPacket.frame.payload;
      const hopBase: Omit<PacketHop, 'step'> = {
        nodeId: current,
        nodeLabel: node.data.label,
        srcIp: ipPacket.srcIp,
        dstIp: ipPacket.dstIp,
        ttl: ipPacket.ttl,
        protocol: protocolName(ipPacket.protocol),
        event: 'forward', // overwritten below
        fromNodeId: ingressFrom ?? undefined,
        timestamp: baseTs,
      };

      if (
        ipPacket.dstIp === BROADCAST_IP &&
        workingPacket.dstNodeId === current &&
        (node.data.dhcpServer != null || node.data.dhcpClient != null)
      ) {
        stepCounter = this.appendHop(
          hops,
          snapshots,
          { ...hopBase, event: 'deliver' },
          workingPacket,
          stepCounter,
        );
        break;
      }

      const effectiveIp = this.getEffectiveNodeIp(node);
      if (
        (node.data.role === 'client' || node.data.role === 'server') &&
        effectiveIp === ipPacket.dstIp
      ) {
        stepCounter = this.appendHop(
          hops,
          snapshots,
          { ...hopBase, event: 'deliver' },
          workingPacket,
          stepCounter,
        );
        break;
      }

      if (ingressFrom !== null) {
        const ingressInterface =
          (senderIp ? this.resolveIngressInterface(current, senderIp) : null) ??
          this.resolvePortFromEdge(current, ingressEdgeId ?? '', 'ingress');
        if (ingressInterface) {
          hopBase.ingressInterfaceId = ingressInterface.id;
          hopBase.ingressInterfaceName = ingressInterface.name;
        }
      }

      const packetBeforeHop = workingPacket;
      let natTranslation: NatTranslation | null = null;
      let outsideToInsideMatched = false;
      let ingressAclMatch = null;
      let egressAclMatch = null;

      if (node.data.role === 'router') {
        const natProcessor = this.getNatProcessor(current);
        if (natProcessor) {
          const preRoutingResult = natProcessor.applyPreRouting(
            workingPacket,
            hopBase.ingressInterfaceId,
            stepCounter,
          );
          if (preRoutingResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: preRoutingResult.dropReason,
            };
            if (preRoutingResult.translation) {
              dropHop.natTranslation = preRoutingResult.translation;
            }
            const changedFields = this.diffPacketFields(packetBeforeHop, preRoutingResult.packet);
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.appendHop(
              hops,
              snapshots,
              dropHop,
              preRoutingResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = preRoutingResult.packet;
          natTranslation = preRoutingResult.translation;
          outsideToInsideMatched = preRoutingResult.matched;
        }

        const aclProcessor = this.getAclProcessor(current);
        if (aclProcessor) {
          const ingressResult = aclProcessor.applyIngress(
            workingPacket,
            hopBase.ingressInterfaceId,
            stepCounter,
          );
          ingressAclMatch = ingressResult.match;
          if (ingressResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: ingressResult.dropReason,
              aclMatch: ingressResult.match ?? undefined,
            };
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            const changedFields = this.diffPacketFields(packetBeforeHop, ingressResult.packet);
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.appendHop(
              hops,
              snapshots,
              dropHop,
              ingressResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = ingressResult.packet;
        }
      }

      // Call router forwarder for TTL decrement and drop detection
      if (node.data.role === 'router') {
        const forwarderFactory = layerRegistry.getForwarder(node.data.layerId);
        if (forwarderFactory) {
          const forwarder = forwarderFactory(current, this.topology);
          const decision = await forwarder.receive(workingPacket, workingPacket.ingressPortId ?? '');
          if (decision.action === 'drop') {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: decision.reason,
              aclMatch: ingressAclMatch ?? undefined,
            };
            // Capture routing decision for no-route drops (but not TTL drops).
            // TTL is checked first in the forwarder, so ttl-exceeded reason means
            // we broke before any routing lookup — intentionally absent on TTL drops.
            if (decision.reason !== 'ttl-exceeded') {
              const routes = this.topology.routeTables.get(current) ?? [];
              dropHop.routingDecision = buildRoutingDecision(workingPacket.frame.payload.dstIp, routes);
            }
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            const changedFields = this.diffPacketFields(packetBeforeHop, workingPacket);
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.appendHop(hops, snapshots, dropHop, workingPacket, stepCounter);
            break;
          }
          workingPacket = decision.packet;
        }
      }

      // Capture routing decision for educational display (router hops only).
      // TTL-exceeded drops break before reaching this point, so routingDecision
      // is intentionally absent on TTL drops.
      if (node.data.role === 'router') {
        const routes = this.topology.routeTables.get(current) ?? [];
        hopBase.routingDecision = buildRoutingDecision(workingPacket.frame.payload.dstIp, routes);
      }

      // Resolve next node via topology graph (independent of egressPort)
      const next = this.resolveNextNode(current, workingPacket, ingressFrom, failureState);
      if (!next) {
        const dropHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: 'drop',
          reason: 'no-route',
          aclMatch: ingressAclMatch ?? undefined,
        };
        if (natTranslation) {
          dropHop.natTranslation = natTranslation;
        }
        const changedFields = this.diffPacketFields(packetBeforeHop, workingPacket);
        if (changedFields.length > 0) {
          dropHop.changedFields = changedFields;
        }
        stepCounter = this.appendHop(hops, snapshots, dropHop, workingPacket, stepCounter);
        break;
      }

      let routerEgressInterface: ResolvedInterface | null = null;

      if (node.data.role === 'router') {
        routerEgressInterface =
          this.resolveEgressInterface(current, workingPacket.frame.payload.dstIp) ??
          this.resolvePortFromEdge(current, next.edgeId, 'egress');
        if (routerEgressInterface) {
          hopBase.egressInterfaceId = routerEgressInterface.id;
          hopBase.egressInterfaceName = routerEgressInterface.name;
        }

        if (
          routerEgressInterface &&
          failureState.downInterfaceIds.has(
            makeInterfaceFailureId(current, routerEgressInterface.id),
          )
        ) {
          const dropHop: Omit<PacketHop, 'step'> = {
            ...hopBase,
            event: 'drop',
            reason: 'interface-down',
            aclMatch: ingressAclMatch ?? undefined,
          };
          const changedFields = this.diffPacketFields(packetBeforeHop, workingPacket);
          if (changedFields.length > 0) {
            dropHop.changedFields = changedFields;
          }
          if (natTranslation) {
            dropHop.natTranslation = natTranslation;
          }
          stepCounter = this.appendHop(hops, snapshots, dropHop, workingPacket, stepCounter);
          break;
        }

        const aclProcessor = this.getAclProcessor(current);
        if (aclProcessor) {
          const egressResult = aclProcessor.applyEgress(
            workingPacket,
            hopBase.egressInterfaceId,
            stepCounter,
          );
          egressAclMatch = egressResult.match;
          if (egressResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: egressResult.dropReason,
              routingDecision: hopBase.routingDecision,
              aclMatch: egressResult.match ?? undefined,
            };
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            const changedFields = this.diffPacketFields(packetBeforeHop, egressResult.packet);
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.appendHop(
              hops,
              snapshots,
              dropHop,
              egressResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = egressResult.packet;
        }

        const natProcessor = this.getNatProcessor(current);
        if (natProcessor) {
          const postRoutingResult = natProcessor.applyPostRouting(
            workingPacket,
            hopBase.ingressInterfaceId,
            hopBase.egressInterfaceId,
            stepCounter,
            outsideToInsideMatched,
          );
          if (postRoutingResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: postRoutingResult.dropReason,
              routingDecision: hopBase.routingDecision,
              aclMatch: egressAclMatch ?? ingressAclMatch ?? undefined,
            };
            if (postRoutingResult.translation ?? natTranslation) {
              dropHop.natTranslation = postRoutingResult.translation ?? natTranslation ?? undefined;
            }
            const changedFields = this.diffPacketFields(packetBeforeHop, postRoutingResult.packet);
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.appendHop(
              hops,
              snapshots,
              dropHop,
              postRoutingResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = postRoutingResult.packet;
          natTranslation = postRoutingResult.translation ?? natTranslation;
        }
      }

      const arpTarget =
        node.data.role === 'router' || node.data.role === 'client' || node.data.role === 'server'
          ? this.resolveArpTargetInfo(
              current,
              next.nodeId,
              workingPacket,
              failureState,
              routerEgressInterface?.id,
              next.edgeId,
            )
          : null;
      const shouldInjectArp = arpTarget !== null && !arpCache.has(arpTarget.targetIp);

      if (shouldInjectArp && ingressFrom === null) {
        const createHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: 'create',
          toNodeId: next.nodeId,
          activeEdgeId: next.edgeId,
        };
        const changedFields = this.diffPacketFields(packetBeforeHop, workingPacket);
        if (changedFields.length > 0) {
          createHop.changedFields = changedFields;
        }
        stepCounter = this.appendHop(hops, snapshots, createHop, workingPacket, stepCounter);
      }

      const packetBeforeForward = shouldInjectArp && ingressFrom === null ? workingPacket : packetBeforeHop;

      if (shouldInjectArp && arpTarget) {
        const targetMac = this.resolveArpTargetMac(
          current,
          next.nodeId,
          arpTarget.targetNodeId,
          workingPacket,
          failureState,
          hopBase.egressInterfaceId,
        );

        stepCounter = this.injectArpExchange(
          current,
          arpTarget.targetNodeId,
          arpTarget.senderIp,
          arpTarget.targetIp,
          arpTarget.senderMac,
          targetMac,
          next.edgeId,
          workingPacket,
          stepCounter,
          hops,
          snapshots,
          baseTs,
        );

        arpCache.set(arpTarget.targetIp, targetMac);
        if (arpTarget.senderIp.trim()) {
          arpCache.set(arpTarget.senderIp, arpTarget.senderMac);
        }
        this.recordArpEntry(nodeArpTables, current, arpTarget.targetIp, targetMac);
        this.recordArpEntry(nodeArpTables, arpTarget.targetNodeId, arpTarget.senderIp, arpTarget.senderMac);
      }

      const forwardHop: Omit<PacketHop, 'step'> = {
        ...hopBase,
        event: ingressFrom === null && !shouldInjectArp ? 'create' : 'forward',
        toNodeId: next.nodeId,
        activeEdgeId: next.edgeId,
      };
      if (natTranslation) {
        forwardHop.natTranslation = natTranslation;
      }
      if (egressAclMatch ?? ingressAclMatch) {
        forwardHop.aclMatch = egressAclMatch ?? ingressAclMatch ?? undefined;
      }
      const resolvedDstMac = arpTarget
        ? (arpCache.get(arpTarget.targetIp) ?? this.resolveArpTargetMac(
            current,
            next.nodeId,
            arpTarget.targetNodeId,
            workingPacket,
            failureState,
            hopBase.egressInterfaceId,
          ))
        : this.resolveDstMac(
            current,
            next.nodeId,
            hopBase.egressInterfaceId,
            workingPacket,
            failureState,
          );

      if (node.data.role === 'router') {
        const egressIface = node.data.interfaces?.find(
          (iface) => iface.id === hopBase.egressInterfaceId,
        );
        senderIp = egressIface?.ipAddress ?? null;
        workingPacket = this.withFrameFcs({
          ...workingPacket,
          frame: {
            ...workingPacket.frame,
            srcMac: egressIface?.macAddress ?? workingPacket.frame.srcMac,
            dstMac: resolvedDstMac ?? workingPacket.frame.dstMac,
          },
        });
      } else if (node.data.role === 'client' || node.data.role === 'server') {
        senderIp = this.getEffectiveNodeIp(node) ?? null;
        const resolvedSrcMac = this.resolveEndpointMac(current);
        workingPacket = this.withFrameFcs({
          ...workingPacket,
          frame: {
            ...workingPacket.frame,
            srcMac:
              resolvedSrcMac && this.isPlaceholderMac(workingPacket.frame.srcMac)
                ? resolvedSrcMac
                : workingPacket.frame.srcMac,
            dstMac:
              resolvedDstMac && this.isPlaceholderMac(workingPacket.frame.dstMac)
                ? resolvedDstMac
                : workingPacket.frame.dstMac,
          },
        });
      } else if (node.data.role === 'switch') {
        const egressPort = this.resolvePortFromEdge(current, next.edgeId, 'egress');
        if (egressPort) {
          forwardHop.egressInterfaceId = egressPort.id;
          forwardHop.egressInterfaceName = egressPort.name;
        }
      }

      const changedFields = this.diffPacketFields(packetBeforeForward, workingPacket);
      if (changedFields.length > 0) {
        forwardHop.changedFields = changedFields;
      }

      stepCounter = this.appendHop(hops, snapshots, forwardHop, workingPacket, stepCounter);

      ingressFrom = current;
      ingressEdgeId = next.edgeId;
      workingPacket = { ...workingPacket, currentDeviceId: next.nodeId };
      current = next.nodeId;
    }

    const lastHop = hops[hops.length - 1];
    const status = lastHop?.event === 'deliver' ? 'delivered' : 'dropped';

    const trace: PacketTrace = {
      packetId: packet.id,
      sessionId: packet.sessionId,
      label: this.deriveTraceLabel(packet),
      srcNodeId: packet.srcNodeId,
      dstNodeId: packet.dstNodeId,
      hops,
      status,
    };

    this.packetSnapshots.set(packet.id, snapshots);
    return { trace, nodeArpTables };
  }

  async precompute(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<PacketTrace> {
    const { trace } = await this.precomputeDetailed(packet, failureState);
    return trace;
  }

  // ── Playback API ───────────────────────────────────────────────────────────

  private mergeNodeArpTables(
    nodeArpTables: Record<string, Record<string, string>>,
  ): Record<string, Record<string, string>> {
    const mergedNodeArpTables = { ...this.state.nodeArpTables };
    for (const [nodeId, table] of Object.entries(nodeArpTables)) {
      mergedNodeArpTables[nodeId] = {
        ...(mergedNodeArpTables[nodeId] ?? {}),
        ...table,
      };
    }
    return mergedNodeArpTables;
  }

  private appendTrace(
    trace: PacketTrace,
    nodeArpTables: Record<string, Record<string, string>> = {},
  ): void {
    this.state = {
      ...this.state,
      status: 'paused',
      traces: [...this.state.traces, trace],
      currentTraceId: trace.packetId,
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: this.mergeNodeArpTables(nodeArpTables),
    };
    this.notify();
  }

  private emitSyntheticDropTrace(packet: InFlightPacket, reason: string): void {
    const sourceNode = this.findNode(packet.srcNodeId);
    const hop: PacketHop = {
      step: 0,
      nodeId: packet.srcNodeId,
      nodeLabel: sourceNode?.data.label ?? packet.srcNodeId,
      srcIp: packet.frame.payload.srcIp,
      dstIp: packet.frame.payload.dstIp,
      ttl: packet.frame.payload.ttl,
      protocol: protocolName(packet.frame.payload.protocol),
      event: 'drop',
      reason,
      timestamp: Date.now(),
    };

    const trace: PacketTrace = {
      packetId: packet.id,
      sessionId: packet.sessionId,
      label: this.deriveTraceLabel(packet),
      srcNodeId: packet.srcNodeId,
      dstNodeId: packet.dstNodeId,
      hops: [hop],
      status: 'dropped',
    };

    this.packetSnapshots.set(packet.id, [packet]);
    this.appendTrace(trace);
  }

  async simulateDhcp(
    clientNodeId: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<boolean> {
    if (this.runtimeNodeIps.has(clientNodeId)) return true;

    const discoverPacket = buildDiscover(clientNodeId, this.topology);
    const discoverMessage = discoverPacket ? getDhcpMessage(discoverPacket) : null;
    const serverNode = discoverPacket ? this.findNode(discoverPacket.dstNodeId) : null;
    if (!discoverPacket || !discoverMessage || !serverNode?.data.dhcpServer) {
      return false;
    }

    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'selecting',
      transactionId: discoverMessage.transactionId,
    });
    this.notify();

    const leaseAllocator = new LeaseAllocator(serverNode.data.dhcpServer);
    const stampedDiscover = { ...discoverPacket, sessionId };
    const discoverResult = await this.precomputeDetailed(stampedDiscover, failureState);
    this.appendTrace(discoverResult.trace, discoverResult.nodeArpTables);
    if (discoverResult.trace.status !== 'delivered') return false;

    const offerPacket = handleDiscover(stampedDiscover, this.topology, leaseAllocator);
    if (!offerPacket) return false;
    const stampedOffer = { ...offerPacket, sessionId };
    const offerResult = await this.precomputeDetailed(stampedOffer, failureState);
    this.appendTrace(offerResult.trace, offerResult.nodeArpTables);
    if (offerResult.trace.status !== 'delivered') return false;

    const offerMessage = getDhcpMessage(stampedOffer);
    if (!offerMessage) return false;
    if (offerMessage.messageType === 'NAK') {
      this.dhcpLeaseStates.set(clientNodeId, {
        status: 'init',
        transactionId: offerMessage.transactionId,
        serverIp: offerMessage.serverIp,
      });
      this.notify();
      return false;
    }

    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'requesting',
      transactionId: offerMessage.transactionId,
      offeredIp: offerMessage.offeredIp,
      serverIp: offerMessage.serverIp,
    });
    this.notify();

    const requestPacket = handleOffer(stampedOffer, clientNodeId, this.topology);
    const stampedRequest = { ...requestPacket, sessionId };
    const requestResult = await this.precomputeDetailed(stampedRequest, failureState);
    this.appendTrace(requestResult.trace, requestResult.nodeArpTables);
    if (requestResult.trace.status !== 'delivered') return false;

    const finalPacket = handleRequest(stampedRequest, this.topology, leaseAllocator);
    if (!finalPacket) return false;
    const stampedFinal = { ...finalPacket, sessionId };
    const finalResult = await this.precomputeDetailed(stampedFinal, failureState);
    this.appendTrace(finalResult.trace, finalResult.nodeArpTables);
    if (finalResult.trace.status !== 'delivered') return false;

    const ackResult = handleAck(stampedFinal);
    if (!ackResult) {
      this.dhcpLeaseStates.set(clientNodeId, {
        status: 'init',
        transactionId: offerMessage.transactionId,
        serverIp: offerMessage.serverIp,
      });
      this.notify();
      return false;
    }

    this.runtimeNodeIps.set(clientNodeId, ackResult.assignedIp);
    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'bound',
      transactionId: offerMessage.transactionId,
      offeredIp: ackResult.assignedIp,
      serverIp: offerMessage.serverIp,
      assignedIp: ackResult.assignedIp,
      subnetMask: ackResult.subnetMask,
      defaultGateway: ackResult.defaultGateway,
      dnsServerIp: ackResult.dnsServerIp,
    });
    this.notify();
    return true;
  }

  async simulateDns(
    clientNodeId: string,
    hostname: string,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<string | null> {
    const cached = this.dnsCaches.get(clientNodeId)?.[hostname];
    if (cached) return cached.address;

    const queryPacket = buildDnsQuery(
      clientNodeId,
      hostname,
      this.topology,
      this.runtimeNodeIps,
      this.dhcpLeaseStates.get(clientNodeId)?.dnsServerIp,
    );
    if (!queryPacket) return null;

    const stampedQuery = { ...queryPacket, sessionId };
    const queryResult = await this.precomputeDetailed(stampedQuery, failureState);
    this.appendTrace(queryResult.trace, queryResult.nodeArpTables);
    if (queryResult.trace.status !== 'delivered') return null;

    const responsePacket = handleDnsQuery(stampedQuery, this.topology);
    if (!responsePacket) return null;
    const stampedResponse = { ...responsePacket, sessionId };
    const responseResult = await this.precomputeDetailed(stampedResponse, failureState);
    this.appendTrace(responseResult.trace, responseResult.nodeArpTables);
    if (responseResult.trace.status !== 'delivered') return null;

    const record = handleDnsResponse(stampedResponse);
    if (!record) return null;

    this.dnsCaches.set(clientNodeId, {
      ...(this.dnsCaches.get(clientNodeId) ?? {}),
      [record.hostname]: {
        address: record.address,
        ttl: record.ttl,
        resolvedAt: Date.now(),
      },
    });
    this.notify();
    return record.address;
  }

  private async preparePacketForSend(
    packet: InFlightPacket,
    failureState: FailureState,
  ): Promise<InFlightPacket | null> {
    const sessionId = packet.sessionId ?? crypto.randomUUID();
    let workingPacket: InFlightPacket = { ...packet, sessionId };
    const sourceNode = this.findNode(workingPacket.srcNodeId);

    if (sourceNode?.data.dhcpClient?.enabled && !this.runtimeNodeIps.has(sourceNode.id)) {
      const bound = await this.simulateDhcp(sourceNode.id, failureState, sessionId);
      if (!bound) {
        this.emitSyntheticDropTrace(workingPacket, 'dhcp-assignment-failed');
        return null;
      }
    }

    const effectiveSrcIp = this.getEffectiveNodeIp(sourceNode);
    if (effectiveSrcIp) {
      workingPacket = this.withPacketIps(workingPacket, { srcIp: effectiveSrcIp });
    }

    const transport = workingPacket.frame.payload.payload;
    if (isHttpPayload(transport) && transport.payload.url) {
      const hostname = extractHostname(transport.payload.url);
      if (hostname && !isIpAddress(hostname)) {
        const resolvedIp = await this.simulateDns(
          workingPacket.srcNodeId,
          hostname,
          failureState,
          sessionId,
        );
        if (!resolvedIp) {
          this.emitSyntheticDropTrace(workingPacket, 'dns-resolution-failed');
          return null;
        }
        workingPacket = this.withPacketIps(workingPacket, { dstIp: resolvedIp });
      }
    }

    return workingPacket;
  }

  async send(packet: InFlightPacket, failureState: FailureState = EMPTY_FAILURE_STATE): Promise<void> {
    this.clearPlay();
    const preparedPacket = await this.preparePacketForSend(packet, failureState);
    if (!preparedPacket) return;

    const { trace, nodeArpTables } = await this.precomputeDetailed(preparedPacket, failureState);
    this.appendTrace(trace, nodeArpTables);
  }

  private currentTrace(): PacketTrace | null {
    if (!this.state.currentTraceId) return null;
    return this.state.traces.find((t) => t.packetId === this.state.currentTraceId) ?? null;
  }

  exportPcap(traceId?: string): Uint8Array {
    const trace = traceId
      ? this.state.traces.find((candidate) => candidate.packetId === traceId) ?? null
      : this.currentTrace();

    if (!trace) {
      return buildPcap([]);
    }

    const snapshots = this.packetSnapshots.get(trace.packetId) ?? [];
    const records: PcapRecord[] = [];

    trace.hops.forEach((hop, index) => {
      const frame = hop.arpFrame ?? snapshots[index]?.frame;
      if (!frame) return;
      records.push({ hop, frame });
    });

    return buildPcap(records);
  }

  step(): void {
    const trace = this.currentTrace();
    if (!trace) return;
    if (this.state.status === 'done') return;

    const nextStep = this.state.currentStep + 1;
    if (nextStep >= trace.hops.length) return;

    const hop = trace.hops[nextStep];
    const snapshots = this.packetSnapshots.get(trace.packetId) ?? [];
    const packetAtStep = snapshots[nextStep];
    const isDone = nextStep === trace.hops.length - 1;

    this.state = {
      ...this.state,
      currentStep: nextStep,
      activeEdgeIds: hop.activeEdgeId ? [hop.activeEdgeId] : [],
      selectedHop: hop,
      selectedPacket: packetAtStep ?? null,
      status: isDone ? 'done' : this.state.status,
    };
    this.notify();

    if (packetAtStep) {
      this.emitHookForHop(hop, packetAtStep);
    }

    if (isDone) {
      this.clearPlay();
    }
  }

  private emitHookForHop(hop: PacketHop, packet: InFlightPacket): void {
    switch (hop.event) {
      case 'create':
        void this.hookEngine.emit('packet:create', { packet, sourceNodeId: hop.nodeId });
        break;
      case 'forward':
        void this.hookEngine.emit('packet:forward', {
          packet,
          fromNodeId: hop.fromNodeId ?? hop.nodeId,
          toNodeId: hop.toNodeId ?? '',
          decision: { action: 'forward', egressPort: hop.activeEdgeId ?? '', packet },
        });
        break;
      case 'deliver':
        void this.hookEngine.emit('packet:deliver', { packet, destinationNodeId: hop.nodeId });
        break;
      case 'drop':
        void this.hookEngine.emit('packet:drop', {
          packet,
          nodeId: hop.nodeId,
          reason: hop.reason ?? 'unknown',
        });
        break;
      case 'arp-request':
      case 'arp-reply':
        break;
    }
  }

  play(ms = DEFAULT_PLAY_INTERVAL_MS): void {
    if (this.state.status === 'done' || this.state.status === 'running') return;
    this.state = { ...this.state, status: 'running' };
    this.notify();
    this.playTimer = setInterval(() => {
      this.step();
    }, ms);
  }

  pause(): void {
    const wasRunning = this.state.status === 'running';
    this.clearPlay();
    if (wasRunning) {
      this.state = { ...this.state, status: 'paused' };
      this.notify();
    }
  }

  reset(): void {
    this.clearPlay();
    this.natProcessors.forEach((processor) => processor.clear());
    this.natProcessors.clear();
    this.aclProcessors.forEach((processor) => processor.clear());
    this.aclProcessors.clear();
    this.state = {
      ...this.state,
      status: this.state.currentTraceId ? 'paused' : 'idle',
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
    };
    this.notify();
  }

  clear(): void {
    this.clearPlay();
    this.packetSnapshots.clear();
    this.runtimeNodeIps.clear();
    this.dhcpLeaseStates.clear();
    this.dnsCaches.clear();
    this.natProcessors.forEach((processor) => processor.clear());
    this.natProcessors.clear();
    this.aclProcessors.forEach((processor) => processor.clear());
    this.aclProcessors.clear();
    this.state = { ...INITIAL_STATE };
    this.notify();
  }

  clearTraces(): void {
    this.clearPlay();
    this.packetSnapshots.clear();
    this.natProcessors.forEach((processor) => processor.clear());
    this.natProcessors.clear();
    this.aclProcessors.forEach((processor) => processor.clear());
    this.aclProcessors.clear();
    this.state = {
      ...this.state,
      status: 'idle',
      traces: [],
      currentTraceId: null,
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: {},
    };
    this.notify();
  }

  selectTrace(packetId: string): void {
    const trace = this.state.traces.find((candidate) => candidate.packetId === packetId);
    if (!trace) return;

    this.clearPlay();
    this.state = {
      ...this.state,
      status: 'paused',
      currentTraceId: trace.packetId,
      currentStep: -1,
      activeEdgeIds: [],
      selectedHop: null,
      selectedPacket: null,
    };
    this.notify();
  }

  selectHop(step: number): void {
    const trace = this.currentTrace();
    if (!trace) return;
    const hop = trace.hops[step];
    if (!hop) return;
    const snapshots = this.packetSnapshots.get(trace.packetId) ?? [];
    const packetAtStep = snapshots[step] ?? null;
    this.state = {
      ...this.state,
      selectedHop: hop,
      activeEdgeIds: hop.activeEdgeId ? [hop.activeEdgeId] : [],
      selectedPacket: packetAtStep,
    };
    this.notify();
  }

  getRuntimeNodeIp(nodeId: string): string | null {
    return this.runtimeNodeIps.get(nodeId) ?? null;
  }

  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null {
    return this.dhcpLeaseStates.get(nodeId) ?? null;
  }

  getDnsCache(nodeId: string): DnsCache | null {
    return this.dnsCaches.get(nodeId) ?? null;
  }

  private clearPlay(): void {
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }
}
