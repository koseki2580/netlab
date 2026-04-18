import type { HookEngine } from "../hooks/HookEngine";
import { layerRegistry } from "../registry/LayerRegistry";
import {
  type FailureState,
  EMPTY_FAILURE_STATE,
  makeInterfaceFailureId,
} from "../types/failure";
import type { ForwardContext } from "../types/layers";
import { IGMP_PROTOCOL } from "../types/multicast";
import type {
  ArpEthernetFrame,
  IcmpMessage,
  IgmpMessage,
  InFlightPacket,
  IpPacket,
  TcpSegment,
  UdpDatagram,
} from "../types/packets";
import type { RouteEntry } from "../types/routing";
import type {
  NatTranslation,
  Neighbor,
  PacketHop,
  RoutingCandidate,
  RoutingDecision,
} from "../types/simulation";
import type { NetlabNode, NetworkTopology } from "../types/topology";
import { computeFcs, computeIpv4Checksum } from "../utils/checksum";
import { isInSubnet, prefixLength } from "../utils/cidr";
import { stableHash32 } from "../utils/hash";
import { deriveDeterministicMac } from "../utils/network";
import {
  buildEthernetFrameBytes,
  buildIpv4HeaderBytes,
  buildTransportBytes,
  bytesToRawString,
  isTcpSegment,
} from "../utils/packetLayout";
import {
  deriveIdentification,
  effectiveMtu,
  fragment,
  packetSizeBytes,
} from "./fragmentation";
import { ICMP_CODE, ICMP_TYPE } from "./icmp";
import { Reassembler } from "./Reassembler";
import { ServiceOrchestrator } from "./ServiceOrchestrator";
import { TraceRecorder } from "./TraceRecorder";
import type { PrecomputeOptions, PrecomputeResult } from "./types";

const MAX_HOPS = 64;
const BROADCAST_IP = "255.255.255.255";

export { deriveDeterministicMac } from "../utils/network";

function isIcmpMessage(payload: IpPacket["payload"]): payload is IcmpMessage {
  return "type" in payload && "code" in payload;
}

export function isIgmpMessage(
  payload: IpPacket["payload"],
): payload is IgmpMessage {
  return "igmpType" in payload && "groupAddress" in payload;
}

export function isUdpDatagram(
  payload: IpPacket["payload"],
): payload is UdpDatagram {
  return (
    payload.layer === "L4" &&
    "srcPort" in payload &&
    "dstPort" in payload &&
    !("flags" in payload) &&
    !("type" in payload)
  );
}

function isPortBearingPayload(
  payload: IpPacket["payload"],
): payload is TcpSegment | UdpDatagram {
  return "srcPort" in payload && "dstPort" in payload;
}

function protocolName(num: number): string {
  if (num === 1) return "ICMP";
  if (num === IGMP_PROTOCOL) return "IGMP";
  if (num === 6) return "TCP";
  if (num === 17) return "UDP";
  return String(num);
}

function sameRoute(
  left: RouteEntry | null | undefined,
  right: RouteEntry | null | undefined,
): boolean {
  if (!left || !right) return false;
  return (
    left.destination === right.destination &&
    left.nextHop === right.nextHop &&
    left.protocol === right.protocol &&
    left.adminDistance === right.adminDistance &&
    left.metric === right.metric &&
    left.nodeId === right.nodeId
  );
}

function buildRoutingDecision(
  dstIp: string,
  routes: RouteEntry[],
  selectedRoute?: RouteEntry | null,
): RoutingDecision {
  const selectionProvided = arguments.length >= 3;
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  const lpmWinner =
    sorted.find((route) => isInSubnet(dstIp, route.destination)) ?? null;
  const candidates: RoutingCandidate[] = sorted.map((r) => {
    const matched = isInSubnet(dstIp, r.destination);
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

  if (lpmWinner) {
    const idx = candidates.findIndex(
      (c) =>
        c.destination === lpmWinner.destination &&
        c.nextHop === lpmWinner.nextHop &&
        c.protocol === lpmWinner.protocol &&
        c.adminDistance === lpmWinner.adminDistance &&
        c.metric === lpmWinner.metric,
    );
    if (idx >= 0) candidates[idx].selectedByLpm = true;
  }

  const activeRoute = selectedRoute ?? null;
  const selectedCandidate = activeRoute
    ? (candidates.find(
        (candidate) =>
          candidate.destination === activeRoute.destination &&
          candidate.nextHop === activeRoute.nextHop &&
          candidate.protocol === activeRoute.protocol &&
          candidate.adminDistance === activeRoute.adminDistance &&
          candidate.metric === activeRoute.metric,
      ) ?? null)
    : null;

  if (selectedCandidate && lpmWinner && !sameRoute(activeRoute, lpmWinner)) {
    selectedCandidate.selectedByFailover = true;
  }

  const winner = selectionProvided
    ? selectedCandidate
    : (candidates.find((candidate) => candidate.selectedByLpm) ?? null);

  let explanation: string;
  if (selectedCandidate) {
    if (lpmWinner && !sameRoute(activeRoute, lpmWinner)) {
      explanation =
        `Fallback via ${selectedCandidate.destination} (${selectedCandidate.nextHop})` +
        ` — primary route ${lpmWinner.destination} (${lpmWinner.nextHop}) unreachable`;
    } else {
      explanation =
        `Matched ${selectedCandidate.destination} via ${selectedCandidate.nextHop}` +
        ` (${selectedCandidate.protocol}, AD=${selectedCandidate.adminDistance})`;
    }
  } else if (
    selectionProvided &&
    candidates.some((candidate) => candidate.matched)
  ) {
    explanation = `No reachable route for ${dstIp} — matching routes are unavailable`;
  } else {
    explanation = `No matching route for ${dstIp} — packet will be dropped`;
  }

  return { dstIp, candidates, winner, explanation };
}

function bestRoute(dstIp: string, routes: RouteEntry[]): RouteEntry | null {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  return sorted.find((r) => isInSubnet(dstIp, r.destination)) ?? null;
}

interface ResolvedInterface {
  id: string;
  name: string;
}

interface LogicalRouterInterface extends ResolvedInterface {
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  mtu?: number;
  parentInterfaceId?: string;
  vlanId?: number;
}

interface ArpTargetInfo {
  targetIp: string;
  targetNodeId: string;
  senderIp: string;
  senderMac: string;
}

interface ForwardLoopParams {
  packet: InFlightPacket;
  current: string;
  ingressFrom: string | null;
  ingressEdgeId: string | null;
  senderIp: string | null;
  stepCounter: number;
  baseTs: number;
  visitedStates: Set<string>;
}

interface ForwardLoopShared {
  hops: PacketHop[];
  snapshots: InFlightPacket[];
  nodeArpTables: Record<string, Record<string, string>>;
  arpCache: Map<string, string>;
  reassemblers: Map<string, Reassembler>;
  failureState: FailureState;
  options: PrecomputeOptions;
}

export class ForwardingPipeline {
  constructor(
    private readonly topology: NetworkTopology,
    _hookEngine: HookEngine,
    private readonly traceRecorder: TraceRecorder,
    private readonly services: ServiceOrchestrator,
  ) {}

  // ── Topology helpers ───────────────────────────────────────────────────────

  getNeighbors(
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
    overrideNextHop?: string,
  ): ResolvedInterface | null {
    const node = this.topology.nodes.find((n) => n.id === nodeId);
    if (!node || node.data.role !== "router") return null;

    let targetIp: string;
    if (overrideNextHop !== undefined) {
      targetIp = overrideNextHop === "direct" ? dstIp : overrideNextHop;
    } else {
      const routes = this.topology.routeTables.get(nodeId) ?? [];
      const route = bestRoute(dstIp, routes);
      if (!route) return null;
      targetIp = route.nextHop === "direct" ? dstIp : route.nextHop;
    }

    const match = this.getLogicalRouterInterfaces(node).find((iface) =>
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

    const match = this.getLogicalRouterInterfaces(node).find((iface) =>
      isInSubnet(senderIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return match ? { id: match.id, name: match.name } : null;
  }

  private getLogicalRouterInterfaces(
    node: NetlabNode | null,
  ): LogicalRouterInterface[] {
    if (!node || node.data.role !== "router") {
      return [];
    }

    return (node.data.interfaces ?? []).flatMap((iface) => {
      const parent: LogicalRouterInterface = {
        id: iface.id,
        name: iface.name,
        ipAddress: iface.ipAddress,
        prefixLength: iface.prefixLength,
        macAddress: iface.macAddress,
        mtu: iface.mtu,
      };
      const subInterfaces = (iface.subInterfaces ?? []).map((subInterface) => ({
        id: subInterface.id,
        name: subInterface.id,
        ipAddress: subInterface.ipAddress,
        prefixLength: subInterface.prefixLength,
        macAddress: iface.macAddress,
        mtu: subInterface.mtu ?? iface.mtu,
        parentInterfaceId: iface.id,
        vlanId: subInterface.vlanId,
      }));
      return [parent, ...subInterfaces];
    });
  }

  private findLogicalRouterInterfaceById(
    nodeId: string,
    interfaceId: string | undefined,
  ): LogicalRouterInterface | null {
    if (!interfaceId) return null;
    const node = this.findNode(nodeId);
    return (
      this.getLogicalRouterInterfaces(node).find(
        (iface) => iface.id === interfaceId,
      ) ?? null
    );
  }

  private findGatewayRouterThroughSwitches(
    switchNodeId: string,
    sourceNodeId: string,
    senderIp: string,
    failureState: FailureState,
    visited = new Set<string>(),
  ): { node: NetlabNode; iface: LogicalRouterInterface } | null {
    if (visited.has(switchNodeId)) return null;
    visited.add(switchNodeId);

    const neighbors = this.getNeighbors(
      switchNodeId,
      sourceNodeId,
      failureState,
    );
    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node) continue;
      if (node.data.role === "router") {
        const iface = this.getLogicalRouterInterfaces(node).find((candidate) =>
          isInSubnet(
            senderIp,
            `${candidate.ipAddress}/${candidate.prefixLength}`,
          ),
        );
        if (iface) {
          return { node, iface };
        }
      }
    }

    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node || node.data.role !== "switch") continue;

      const match = this.findGatewayRouterThroughSwitches(
        node.id,
        switchNodeId,
        senderIp,
        failureState,
        visited,
      );
      if (match) return match;
    }

    return null;
  }

  private resolvePortFromEdge(
    nodeId: string,
    edgeId: string,
    direction: "ingress" | "egress",
  ): ResolvedInterface | null {
    if (!edgeId) return null;

    const edge = this.topology.edges.find(
      (candidate) => candidate.id === edgeId,
    );
    if (!edge) return null;

    const handleId =
      direction === "egress"
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

    const node = this.topology.nodes.find(
      (candidate) => candidate.id === nodeId,
    );
    if (!node) return null;

    const iface = node.data.interfaces?.find(
      (candidate) => candidate.id === handleId,
    );
    const port = node.data.ports?.find(
      (candidate) => candidate.id === handleId,
    );
    const resolved = iface ?? port;

    return resolved ? { id: resolved.id, name: resolved.name } : null;
  }

  findNode(nodeId: string) {
    return (
      this.topology.nodes.find((candidate) => candidate.id === nodeId) ?? null
    );
  }

  private getForwardingVlanId(packet: InFlightPacket): number {
    return packet.vlanId ?? packet.frame.vlanTag?.vid ?? 0;
  }

  private buildLoopGuardKey(
    node: NetlabNode,
    packet: InFlightPacket,
    ingressEdgeId: string | null,
  ): string {
    if (node.data.role !== "switch") {
      return node.id;
    }

    const ingressKey = packet.ingressPortId || ingressEdgeId || "origin";
    return `${node.id}:${ingressKey}:${this.getForwardingVlanId(packet)}`;
  }

  private isPlaceholderMac(mac: string): boolean {
    const normalized = mac.trim().toLowerCase();
    return (
      normalized === "00:00:00:00:00:00" ||
      normalized === "00:00:00:00:00:01" ||
      normalized === "00:00:00:00:00:02"
    );
  }

  private derivePacketIdentification(packet: InFlightPacket): number {
    const payload = packet.frame.payload.payload;
    const sequenceNumber = isIcmpMessage(payload)
      ? payload.sequenceNumber
      : isTcpSegment(payload)
        ? payload.seq
        : undefined;

    return deriveIdentification(
      packet.frame.payload.srcIp,
      packet.frame.payload.dstIp,
      packet.sessionId,
      sequenceNumber,
    );
  }

  private resolveEndpointMac(nodeId: string): string | null {
    const node = this.findNode(nodeId);
    if (!node || (node.data.role !== "client" && node.data.role !== "server")) {
      return null;
    }

    return typeof node.data.mac === "string" &&
      node.data.mac.length > 0 &&
      !this.isPlaceholderMac(node.data.mac)
      ? node.data.mac
      : deriveDeterministicMac(nodeId);
  }

  getEffectiveNodeIp(node: NetlabNode | null): string | undefined {
    if (!node) return undefined;
    return this.services.getRuntimeNodeIp(node.id) ?? node.data.ip;
  }

  private nodeOwnsIp(node: NetlabNode, ip: string): boolean {
    if (this.getEffectiveNodeIp(node) === ip) return true;
    return this.getLogicalRouterInterfaces(node).some(
      (iface) => iface.ipAddress === ip,
    );
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

    const neighbors = this.getNeighbors(
      switchNodeId,
      sourceNodeId,
      failureState,
    );
    const switchNeighbors = [];

    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node) continue;

      if (node.data.role === "switch") {
        switchNeighbors.push(node.id);
        continue;
      }

      const interfaces = node.data.interfaces ?? [];
      const matchesTarget =
        (targetNodeId !== undefined && node.id === targetNodeId) ||
        (targetIp !== null &&
          (this.getEffectiveNodeIp(node) === targetIp ||
            interfaces.some((iface) => iface.ipAddress === targetIp)));

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

    const neighbors = this.getNeighbors(
      switchNodeId,
      sourceNodeId,
      failureState,
    );
    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node) continue;
      if (node.data.role !== "switch") {
        return node;
      }
    }

    for (const neighbor of neighbors) {
      const node = this.findNode(neighbor.nodeId);
      if (!node || node.data.role !== "switch") continue;

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
    overrideNextHop?: string,
  ): NetlabNode | null {
    const nextNode = this.findNode(nextNodeId);
    if (!nextNode) return null;
    if (nextNode.data.role !== "switch") {
      return nextNode;
    }

    const currentNode = this.findNode(currentNodeId);
    if (!currentNode) return null;

    let targetIp: string | null = packet.frame.payload.dstIp;
    let targetNodeId: string | undefined = packet.dstNodeId;

    if (
      currentNode.data.role === "client" ||
      currentNode.data.role === "server"
    ) {
      const senderIp = this.getEffectiveNodeIp(currentNode);
      if (senderIp && targetIp) {
        const gateway = this.findGatewayRouterThroughSwitches(
          nextNodeId,
          currentNodeId,
          senderIp,
          failureState,
        );
        if (
          gateway &&
          !isInSubnet(
            targetIp,
            `${gateway.iface.ipAddress}/${gateway.iface.prefixLength}`,
          )
        ) {
          return gateway.node;
        }
      }
    }

    if (currentNode.data.role === "router") {
      if (overrideNextHop !== undefined) {
        if (overrideNextHop !== "direct") {
          targetIp = overrideNextHop;
          targetNodeId = undefined;
        }
      } else {
        const route = bestRoute(
          packet.frame.payload.dstIp,
          this.topology.routeTables.get(currentNodeId) ?? [],
        );
        if (route?.nextHop && route.nextHop !== "direct") {
          targetIp = route.nextHop;
          targetNodeId = undefined;
        }
      }
    }

    return (
      this.findMatchingNodeThroughSwitches(
        nextNodeId,
        currentNodeId,
        targetIp,
        targetNodeId,
        failureState,
      ) ?? this.findFirstNonSwitchNode(nextNodeId, currentNodeId, failureState)
    );
  }

  private resolveRouterMac(
    currentNodeId: string,
    routerNodeId: string,
    packet: InFlightPacket,
    egressInterfaceId?: string,
    overrideNextHop?: string,
  ): string | null {
    const routerNode = this.findNode(routerNodeId);
    if (!routerNode || routerNode.data.role !== "router") return null;

    const routerInterfaces = this.getLogicalRouterInterfaces(routerNode);
    const currentNode = this.findNode(currentNodeId);

    if (currentNode?.data.role === "router") {
      const nextHop =
        overrideNextHop !== undefined
          ? overrideNextHop
          : bestRoute(
              packet.frame.payload.dstIp,
              this.topology.routeTables.get(currentNodeId) ?? [],
            )?.nextHop;

      if (nextHop && nextHop !== "direct") {
        const nextHopInterface = routerInterfaces.find(
          (iface) => iface.ipAddress === nextHop,
        );
        if (nextHopInterface) return nextHopInterface.macAddress;
      }

      const egressInterface = this.findLogicalRouterInterfaceById(
        currentNodeId,
        egressInterfaceId,
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

    return (
      ingressFacingInterface?.macAddress ??
      routerInterfaces[0]?.macAddress ??
      null
    );
  }

  private resolveDstMac(
    currentNodeId: string,
    nextNodeId: string,
    egressInterfaceId: string | undefined,
    packet: InFlightPacket,
    failureState: FailureState,
    overrideNextHop?: string,
  ): string | null {
    const destinationNode = this.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
      overrideNextHop,
    );

    if (!destinationNode) return null;

    if (destinationNode.data.role === "router") {
      return (
        this.resolveRouterMac(
          currentNodeId,
          destinationNode.id,
          packet,
          egressInterfaceId,
          overrideNextHop,
        ) ?? deriveDeterministicMac(destinationNode.id)
      );
    }

    if (
      destinationNode.data.role === "client" ||
      destinationNode.data.role === "server"
    ) {
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
    overrideNextHop?: string,
  ): ArpTargetInfo | null {
    const currentNode = this.findNode(currentNodeId);
    if (!currentNode) return null;
    if (packet.frame.payload.dstIp === BROADCAST_IP) return null;

    if (currentNode.data.role === "router") {
      let targetIp: string | null;
      if (overrideNextHop !== undefined) {
        targetIp =
          overrideNextHop === "direct"
            ? packet.frame.payload.dstIp
            : overrideNextHop;
      } else {
        const routes = this.topology.routeTables.get(currentNodeId) ?? [];
        const route = bestRoute(packet.frame.payload.dstIp, routes);
        if (!route) return null;
        targetIp =
          route.nextHop === "direct"
            ? packet.frame.payload.dstIp
            : route.nextHop;
      }

      if (!targetIp) return null;

      const targetNode = this.resolveEffectiveLayer2Destination(
        currentNodeId,
        nextNodeId,
        packet,
        failureState,
        overrideNextHop,
      );
      if (!targetNode || !this.nodeOwnsIp(targetNode, targetIp)) return null;

      const egressInterface =
        this.findLogicalRouterInterfaceById(currentNodeId, egressInterfaceId) ??
        (() => {
          const fallback = this.resolvePortFromEdge(
            currentNodeId,
            edgeId ?? "",
            "egress",
          );
          return this.findLogicalRouterInterfaceById(
            currentNodeId,
            fallback?.id,
          );
        })();

      return {
        targetIp,
        targetNodeId: targetNode.id,
        senderIp: egressInterface?.ipAddress ?? "",
        senderMac:
          egressInterface?.macAddress ?? deriveDeterministicMac(currentNodeId),
      };
    }

    if (
      currentNode.data.role !== "client" &&
      currentNode.data.role !== "server"
    ) {
      return null;
    }

    const targetNode = this.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
      overrideNextHop,
    );
    if (!targetNode) return null;

    const senderIp = this.getEffectiveNodeIp(currentNode) ?? "";
    let targetIp = "";

    if (targetNode.data.role === "router") {
      const gatewayInterface = this.getLogicalRouterInterfaces(targetNode).find(
        (iface) =>
          senderIp.length > 0 &&
          isInSubnet(senderIp, `${iface.ipAddress}/${iface.prefixLength}`),
      );
      targetIp = gatewayInterface?.ipAddress ?? "";
    } else if (
      targetNode.data.role === "client" ||
      targetNode.data.role === "server"
    ) {
      targetIp = this.getEffectiveNodeIp(targetNode) ?? "";
    }

    if (!targetIp || !this.nodeOwnsIp(targetNode, targetIp)) return null;

    return {
      targetIp,
      targetNodeId: targetNode.id,
      senderIp,
      senderMac:
        this.resolveEndpointMac(currentNodeId) ??
        deriveDeterministicMac(currentNodeId),
    };
  }

  private resolveArpTargetMac(
    currentNodeId: string,
    nextNodeId: string,
    targetNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    egressInterfaceId?: string,
    overrideNextHop?: string,
  ): string {
    const resolvedMac = this.resolveDstMac(
      currentNodeId,
      nextNodeId,
      egressInterfaceId,
      packet,
      failureState,
      overrideNextHop,
    );
    if (resolvedMac) return resolvedMac;

    const targetNode = this.findNode(targetNodeId);
    if (targetNode?.data.role === "router") {
      return (
        this.resolveRouterMac(
          currentNodeId,
          targetNodeId,
          packet,
          egressInterfaceId,
          overrideNextHop,
        ) ?? deriveDeterministicMac(targetNodeId)
      );
    }

    return (
      this.resolveEndpointMac(targetNodeId) ??
      deriveDeterministicMac(targetNodeId)
    );
  }

  private seedArpCache(cache: Map<string, string>): void {
    for (const node of this.topology.nodes) {
      for (const iface of this.getLogicalRouterInterfaces(node)) {
        if (
          iface.ipAddress &&
          iface.macAddress &&
          !this.isPlaceholderMac(iface.macAddress)
        ) {
          cache.set(iface.ipAddress, iface.macAddress);
        }
      }

      const effectiveIp = this.getEffectiveNodeIp(node);
      if (
        typeof effectiveIp === "string" &&
        effectiveIp &&
        typeof node.data.mac === "string" &&
        node.data.mac &&
        !this.isPlaceholderMac(node.data.mac)
      ) {
        cache.set(effectiveIp, node.data.mac);
      }
    }
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

  private withPacketMacs(
    hop: Omit<PacketHop, "step">,
    packet: InFlightPacket,
  ): Omit<PacketHop, "step"> {
    return {
      ...hop,
      srcMac: packet.frame.srcMac,
      dstMac: packet.frame.dstMac,
    };
  }

  private withArpFrameMacs(
    hop: Omit<PacketHop, "step">,
    arpFrame: ArpEthernetFrame,
  ): Omit<PacketHop, "step"> {
    return {
      ...hop,
      srcMac: arpFrame.srcMac,
      dstMac: arpFrame.dstMac,
    };
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
      layer: "L2",
      srcMac: senderMac,
      dstMac: "ff:ff:ff:ff:ff:ff",
      etherType: 0x0806,
      payload: {
        layer: "ARP",
        hardwareType: 1,
        protocolType: 0x0800,
        operation: "request",
        senderMac,
        senderIp,
        targetMac: "00:00:00:00:00:00",
        targetIp,
      },
    };

    stepCounter = this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.withArpFrameMacs(
        {
          nodeId: senderNodeId,
          nodeLabel: senderNode?.data.label ?? senderNodeId,
          srcIp: senderIp,
          dstIp: targetIp,
          ttl: 0,
          protocol: "ARP",
          event: "arp-request",
          toNodeId: targetNodeId,
          activeEdgeId: edgeId,
          arpFrame: arpRequestFrame,
          timestamp: baseTs,
        },
        arpRequestFrame,
      ),
      workingPacket,
      stepCounter,
    );

    const arpReplyFrame: ArpEthernetFrame = {
      layer: "L2",
      srcMac: targetMac,
      dstMac: senderMac,
      etherType: 0x0806,
      payload: {
        layer: "ARP",
        hardwareType: 1,
        protocolType: 0x0800,
        operation: "reply",
        senderMac: targetMac,
        senderIp: targetIp,
        targetMac: senderMac,
        targetIp: senderIp,
      },
    };

    return this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.withArpFrameMacs(
        {
          nodeId: targetNodeId,
          nodeLabel: targetNode?.data.label ?? targetNodeId,
          srcIp: targetIp,
          dstIp: senderIp,
          ttl: 0,
          protocol: "ARP",
          event: "arp-reply",
          toNodeId: senderNodeId,
          activeEdgeId: edgeId,
          arpFrame: arpReplyFrame,
          timestamp: baseTs,
        },
        arpReplyFrame,
      ),
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

  private diffPacketFields(
    before: InFlightPacket,
    after: InFlightPacket,
  ): string[] {
    const changedFields: string[] = [];
    const beforeTransport = before.frame.payload.payload;
    const afterTransport = after.frame.payload.payload;

    if (before.frame.payload.ttl !== after.frame.payload.ttl) {
      changedFields.push("TTL");
    }
    if (
      before.frame.payload.headerChecksum !== after.frame.payload.headerChecksum
    ) {
      changedFields.push("Header Checksum");
    }
    if (before.frame.payload.srcIp !== after.frame.payload.srcIp) {
      changedFields.push("Src IP");
    }
    if (before.frame.payload.dstIp !== after.frame.payload.dstIp) {
      changedFields.push("Dst IP");
    }
    if (
      isPortBearingPayload(beforeTransport) &&
      isPortBearingPayload(afterTransport)
    ) {
      if (beforeTransport.srcPort !== afterTransport.srcPort) {
        changedFields.push("Src Port");
      }
      if (beforeTransport.dstPort !== afterTransport.dstPort) {
        changedFields.push("Dst Port");
      }
    }
    if (before.frame.srcMac !== after.frame.srcMac) {
      changedFields.push("Src MAC");
    }
    if (before.frame.dstMac !== after.frame.dstMac) {
      changedFields.push("Dst MAC");
    }
    if (before.frame.fcs !== after.frame.fcs) {
      changedFields.push("FCS");
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
          identification:
            ipPacket.identification ?? this.derivePacketIdentification(packet),
        },
      },
    };

    const next =
      currentNode?.data.role === "client" || currentNode?.data.role === "server"
        ? (this.getNeighbors(packet.currentDeviceId, null, failureState)[0] ??
          null)
        : null;

    if (currentNode?.data.role === "router" && next) {
      const egressInterface =
        this.resolveEgressInterface(
          packet.currentDeviceId,
          packet.frame.payload.dstIp,
        ) ??
        this.resolvePortFromEdge(packet.currentDeviceId, next.edgeId, "egress");
      const srcMac = this.findLogicalRouterInterfaceById(
        currentNode.id,
        egressInterface?.id,
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
    } else if (
      currentNode?.data.role === "client" ||
      currentNode?.data.role === "server"
    ) {
      const resolvedSrcMac = this.resolveEndpointMac(currentNode.id);
      const arpTarget = next
        ? this.resolveArpTargetInfo(
            currentNode.id,
            next.nodeId,
            workingPacket,
            failureState,
            undefined,
            next.edgeId,
            undefined,
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

  private findNodeByIp(ip: string): NetlabNode | null {
    return (
      this.topology.nodes.find((node) => this.nodeOwnsIp(node, ip)) ?? null
    );
  }

  private makePacketId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private buildIcmpPacket(
    packetId: string,
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    ttl: number,
    payload: IcmpMessage,
  ): InFlightPacket {
    return {
      id: packetId,
      srcNodeId,
      dstNodeId,
      currentDeviceId: srcNodeId,
      ingressPortId: "",
      path: [],
      timestamp: Date.now(),
      frame: {
        layer: "L2",
        srcMac: "00:00:00:00:00:00",
        dstMac: "00:00:00:00:00:00",
        etherType: 0x0800,
        payload: {
          layer: "L3",
          srcIp,
          dstIp,
          ttl,
          protocol: 1,
          payload,
        },
      },
    };
  }

  private buildIcmpEchoRequest(
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    ttl: number,
  ): InFlightPacket {
    const packetId = this.makePacketId("icmp-echo-request");
    return this.buildIcmpPacket(
      packetId,
      srcNodeId,
      dstNodeId,
      srcIp,
      dstIp,
      ttl,
      {
        layer: "L4",
        type: ICMP_TYPE.ECHO_REQUEST,
        code: 0,
        checksum: 0,
        identifier: stableHash32(packetId) & 0xffff,
        sequenceNumber: 1,
      },
    );
  }

  private buildIcmpEchoReply(
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    requestPacket: InFlightPacket,
  ): InFlightPacket {
    const requestPayload = requestPacket.frame.payload.payload;
    const packetId = `${requestPacket.id}-reply`;
    return this.buildIcmpPacket(
      packetId,
      srcNodeId,
      dstNodeId,
      srcIp,
      dstIp,
      64,
      {
        layer: "L4",
        type: ICMP_TYPE.ECHO_REPLY,
        code: 0,
        checksum: 0,
        identifier: isIcmpMessage(requestPayload)
          ? requestPayload.identifier
          : undefined,
        sequenceNumber: isIcmpMessage(requestPayload)
          ? requestPayload.sequenceNumber
          : undefined,
      },
    );
  }

  private buildIcmpTimeExceeded(
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
  ): InFlightPacket {
    return this.buildIcmpPacket(
      `${originalPacket.id}-ttl-exceeded`,
      routerNodeId,
      originalPacket.srcNodeId,
      routerIp,
      originalPacket.frame.payload.srcIp,
      64,
      {
        layer: "L4",
        type: ICMP_TYPE.TIME_EXCEEDED,
        code: ICMP_CODE.TTL_EXCEEDED_IN_TRANSIT,
        checksum: 0,
        data: `Original dst: ${originalPacket.frame.payload.dstIp}`,
      },
    );
  }

  private shouldEmitGeneratedIcmp(srcIp: string): boolean {
    return srcIp !== "0.0.0.0" && srcIp !== BROADCAST_IP;
  }

  private buildIcmpFragmentationNeeded(
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
    nextHopMtu: number,
  ): InFlightPacket {
    const quotedBytes = [
      ...buildIpv4HeaderBytes(originalPacket.frame.payload),
      ...buildTransportBytes(originalPacket.frame.payload.payload).slice(0, 8),
    ];

    return this.buildIcmpPacket(
      `${originalPacket.id}-frag-needed`,
      routerNodeId,
      originalPacket.srcNodeId,
      routerIp,
      originalPacket.frame.payload.srcIp,
      64,
      {
        layer: "L4",
        type: ICMP_TYPE.DESTINATION_UNREACHABLE,
        code: ICMP_CODE.FRAGMENTATION_NEEDED,
        checksum: 0,
        sequenceNumber: nextHopMtu,
        data: bytesToRawString(quotedBytes),
      },
    );
  }

  withPacketIps(
    packet: InFlightPacket,
    ips: { srcIp?: string; dstIp?: string },
  ): InFlightPacket {
    const srcIp = ips.srcIp ?? packet.frame.payload.srcIp;
    const dstIp = ips.dstIp ?? packet.frame.payload.dstIp;
    if (
      srcIp === packet.frame.payload.srcIp &&
      dstIp === packet.frame.payload.dstIp
    ) {
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

  private async runForwardingLoop(
    params: ForwardLoopParams,
    shared: ForwardLoopShared,
  ): Promise<{ stepCounter: number; generatedIcmpPackets: InFlightPacket[] }> {
    let {
      packet: workingPacket,
      current,
      ingressFrom,
      ingressEdgeId,
      senderIp,
      stepCounter,
      baseTs,
      visitedStates,
    } = params;
    const { hops, snapshots, nodeArpTables, arpCache, failureState, options } =
      shared;
    const generatedIcmpPackets: InFlightPacket[] = [];

    for (let iter = 0; iter < MAX_HOPS; iter += 1) {
      const node = this.findNode(current);
      if (!node) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.withPacketMacs(
            {
              nodeId: current,
              nodeLabel: current,
              srcIp: workingPacket.frame.payload.srcIp,
              dstIp: workingPacket.frame.payload.dstIp,
              ttl: workingPacket.frame.payload.ttl,
              protocol: protocolName(workingPacket.frame.payload.protocol),
              event: "drop",
              fromNodeId: ingressFrom ?? undefined,
              reason: "node-not-found",
              timestamp: baseTs,
            },
            workingPacket,
          ),
          workingPacket,
          stepCounter,
        );
        break;
      }

      const loopGuardKey = this.buildLoopGuardKey(
        node,
        workingPacket,
        ingressEdgeId,
      );
      if (visitedStates.has(loopGuardKey)) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.withPacketMacs(
            {
              nodeId: current,
              nodeLabel: node.data.label,
              srcIp: workingPacket.frame.payload.srcIp,
              dstIp: workingPacket.frame.payload.dstIp,
              ttl: workingPacket.frame.payload.ttl,
              protocol: protocolName(workingPacket.frame.payload.protocol),
              event: "drop",
              fromNodeId: ingressFrom ?? undefined,
              reason: "routing-loop",
              timestamp: baseTs,
            },
            workingPacket,
          ),
          workingPacket,
          stepCounter,
        );
        break;
      }
      visitedStates.add(loopGuardKey);

      if (failureState.downNodeIds.has(current)) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.withPacketMacs(
            {
              nodeId: current,
              nodeLabel: node.data.label,
              srcIp: workingPacket.frame.payload.srcIp,
              dstIp: workingPacket.frame.payload.dstIp,
              ttl: workingPacket.frame.payload.ttl,
              protocol: protocolName(workingPacket.frame.payload.protocol),
              event: "drop",
              fromNodeId: ingressFrom ?? undefined,
              reason: "node-down",
              timestamp: baseTs,
            },
            workingPacket,
          ),
          workingPacket,
          stepCounter,
        );
        break;
      }

      const ipPacket = workingPacket.frame.payload;
      const transport = ipPacket.payload;
      const hopBase: Omit<PacketHop, "step"> = {
        nodeId: current,
        nodeLabel: node.data.label,
        srcIp: ipPacket.srcIp,
        dstIp: ipPacket.dstIp,
        ttl: ipPacket.ttl,
        protocol: protocolName(ipPacket.protocol),
        ...(isPortBearingPayload(transport)
          ? { srcPort: transport.srcPort, dstPort: transport.dstPort }
          : {}),
        ...(isIgmpMessage(transport)
          ? {
              action:
                transport.groupAddress !== "0.0.0.0"
                  ? (`IGMP ${transport.igmpType} group=${transport.groupAddress}` as const)
                  : (`IGMP ${transport.igmpType}` as const),
            }
          : {}),
        event: "forward",
        fromNodeId: ingressFrom ?? undefined,
        timestamp: baseTs,
      };

      if (
        ipPacket.dstIp === BROADCAST_IP &&
        workingPacket.dstNodeId === current &&
        (node.data.dhcpServer != null || node.data.dhcpClient != null)
      ) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.withPacketMacs({ ...hopBase, event: "deliver" }, workingPacket),
          workingPacket,
          stepCounter,
        );
        break;
      }

      if (
        workingPacket.dstNodeId === current &&
        node.data.role !== "switch" &&
        this.nodeOwnsIp(node, ipPacket.dstIp)
      ) {
        const isFragmentedPacket =
          ipPacket.identification !== undefined &&
          (ipPacket.flags?.mf === true || (ipPacket.fragmentOffset ?? 0) > 0);

        if (isFragmentedPacket) {
          const reassembler =
            shared.reassemblers.get(current) ?? new Reassembler();
          shared.reassemblers.set(current, reassembler);
          const reassembledPacket = reassembler.accept(ipPacket);

          if (!reassembledPacket) {
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(
                { ...hopBase, event: "deliver", action: "reassembly-pending" },
                workingPacket,
              ),
              workingPacket,
              stepCounter,
            );
            break;
          }

          const deliveredPacket = this.withFrameFcs(
            this.withIpv4HeaderChecksum({
              ...workingPacket,
              frame: {
                ...workingPacket.frame,
                payload: reassembledPacket,
              },
            }),
          );
          stepCounter = this.traceRecorder.appendHop(
            hops,
            snapshots,
            this.withPacketMacs(
              {
                ...hopBase,
                event: "deliver",
                action: "reassembly-complete",
                fragmentCount:
                  reassembler.getLastCompletedFragmentCount() ?? undefined,
              },
              deliveredPacket,
            ),
            deliveredPacket,
            stepCounter,
          );
          break;
        }

        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.withPacketMacs({ ...hopBase, event: "deliver" }, workingPacket),
          workingPacket,
          stepCounter,
        );
        break;
      }

      if (ingressFrom !== null) {
        const ingressInterface =
          (senderIp ? this.resolveIngressInterface(current, senderIp) : null) ??
          this.resolvePortFromEdge(current, ingressEdgeId ?? "", "ingress");
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
      const neighbors = this.getNeighbors(
        current,
        node.data.role === "router" ? null : ingressFrom,
        failureState,
      );
      const forwardCtx: ForwardContext = {
        neighbors,
        multicastTable:
          node.data.role === "switch"
            ? (this.services.getMulticastTable(current) ?? undefined)
            : undefined,
      };
      let next: Neighbor | null = null;
      let selectedRoute: RouteEntry | null = null;
      let routerEgressInterface: ResolvedInterface | null = null;

      if (node.data.role === "router") {
        const natProcessor = this.services.getNatProcessor(current);
        if (natProcessor) {
          const preRoutingResult = natProcessor.applyPreRouting(
            workingPacket,
            hopBase.ingressInterfaceId,
            stepCounter,
          );
          if (preRoutingResult.dropReason) {
            const dropHop: Omit<PacketHop, "step"> = {
              ...hopBase,
              event: "drop",
              reason: preRoutingResult.dropReason,
            };
            if (preRoutingResult.translation) {
              dropHop.natTranslation = preRoutingResult.translation;
            }
            const changedFields = this.diffPacketFields(
              packetBeforeHop,
              preRoutingResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(dropHop, preRoutingResult.packet),
              preRoutingResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = preRoutingResult.packet;
          natTranslation = preRoutingResult.translation;
          outsideToInsideMatched = preRoutingResult.matched;
        }

        const aclProcessor = this.services.getAclProcessor(current);
        if (aclProcessor) {
          const ingressResult = aclProcessor.applyIngress(
            workingPacket,
            hopBase.ingressInterfaceId,
            stepCounter,
          );
          ingressAclMatch = ingressResult.match;
          if (ingressResult.dropReason) {
            const dropHop: Omit<PacketHop, "step"> = {
              ...hopBase,
              event: "drop",
              reason: ingressResult.dropReason,
              aclMatch: ingressResult.match ?? undefined,
            };
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            const changedFields = this.diffPacketFields(
              packetBeforeHop,
              ingressResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(dropHop, ingressResult.packet),
              ingressResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = ingressResult.packet;
        }

        // IGMP processing: router records membership from Reports/Leaves
        if (ipPacket.protocol === IGMP_PROTOCOL && isIgmpMessage(transport)) {
          const igmpProcessor = this.services.getIgmpProcessor(current);
          if (igmpProcessor) {
            const ifaceId = hopBase.ingressInterfaceId ?? current;
            if (transport.igmpType === "v2-membership-report") {
              igmpProcessor.recordReport(ifaceId, transport.groupAddress);
            } else if (transport.igmpType === "v2-leave-group") {
              igmpProcessor.recordLeave(ifaceId, transport.groupAddress);
            }
          }
        }
      }

      if (node.data.role === "router" || node.data.role === "switch") {
        const forwarderFactory = layerRegistry.getForwarder(node.data.layerId);
        if (forwarderFactory) {
          const forwarder = forwarderFactory(current, this.topology);
          const decision = await forwarder.receive(
            workingPacket,
            workingPacket.ingressPortId ?? "",
            forwardCtx,
          );
          if (decision.action === "drop") {
            const dropHop: Omit<PacketHop, "step"> = {
              ...hopBase,
              event: "drop",
              reason: decision.reason,
              aclMatch: ingressAclMatch ?? undefined,
            };
            if (
              node.data.role === "router" &&
              decision.reason !== "ttl-exceeded"
            ) {
              const routes = this.topology.routeTables.get(current) ?? [];
              dropHop.routingDecision = buildRoutingDecision(
                workingPacket.frame.payload.dstIp,
                routes,
                null,
              );
            }
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            if (
              node.data.role === "router" &&
              decision.reason === "ttl-exceeded" &&
              !options.suppressGeneratedIcmp
            ) {
              const routerIp = hopBase.ingressInterfaceId
                ? this.findLogicalRouterInterfaceById(
                    current,
                    hopBase.ingressInterfaceId,
                  )?.ipAddress
                : undefined;
              const responseSourceIp =
                routerIp ?? this.getEffectiveNodeIp(node);
              if (
                responseSourceIp &&
                this.shouldEmitGeneratedIcmp(workingPacket.frame.payload.srcIp)
              ) {
                dropHop.icmpGenerated = true;
                generatedIcmpPackets.push(
                  this.buildIcmpTimeExceeded(
                    current,
                    responseSourceIp,
                    workingPacket,
                  ),
                );
              }
            }
            const changedFields = this.diffPacketFields(
              packetBeforeHop,
              workingPacket,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(dropHop, workingPacket),
              workingPacket,
              stepCounter,
            );
            break;
          }

          if (decision.action !== "forward") {
            const deliverHop: Omit<PacketHop, "step"> = {
              ...hopBase,
              event: "deliver",
              aclMatch: ingressAclMatch ?? undefined,
            };
            if (natTranslation) {
              deliverHop.natTranslation = natTranslation;
            }
            const changedFields = this.diffPacketFields(
              packetBeforeHop,
              decision.packet,
            );
            if (changedFields.length > 0) {
              deliverHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(deliverHop, decision.packet),
              decision.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = decision.packet;
          next = { nodeId: decision.nextNodeId, edgeId: decision.edgeId };

          if (node.data.role === "router") {
            selectedRoute = decision.selectedRoute ?? null;
            const ingressInterfaceMatch = this.findLogicalRouterInterfaceById(
              current,
              decision.ingressInterfaceId,
            );
            if (ingressInterfaceMatch) {
              hopBase.ingressInterfaceId = ingressInterfaceMatch.id;
              hopBase.ingressInterfaceName = ingressInterfaceMatch.name;
            }
            const egressInterfaceId = decision.egressInterfaceId;
            const interfaceMatch = this.findLogicalRouterInterfaceById(
              current,
              egressInterfaceId,
            );
            routerEgressInterface = interfaceMatch
              ? { id: interfaceMatch.id, name: interfaceMatch.name }
              : this.resolvePortFromEdge(current, next.edgeId, "egress");
          }
        }
      } else if (ingressFrom === null) {
        next = neighbors[0] ?? null;
      }

      if (node.data.role === "router") {
        const routes = this.topology.routeTables.get(current) ?? [];
        hopBase.routingDecision = buildRoutingDecision(
          workingPacket.frame.payload.dstIp,
          routes,
          selectedRoute,
        );
      }

      if (!next) {
        const dropHop: Omit<PacketHop, "step"> = {
          ...hopBase,
          event: "drop",
          reason: "no-route",
          aclMatch: ingressAclMatch ?? undefined,
        };
        if (natTranslation) {
          dropHop.natTranslation = natTranslation;
        }
        const changedFields = this.diffPacketFields(
          packetBeforeHop,
          workingPacket,
        );
        if (changedFields.length > 0) {
          dropHop.changedFields = changedFields;
        }
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.withPacketMacs(dropHop, workingPacket),
          workingPacket,
          stepCounter,
        );
        break;
      }

      if (node.data.role === "router") {
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
          const dropHop: Omit<PacketHop, "step"> = {
            ...hopBase,
            event: "drop",
            reason: "interface-down",
            aclMatch: ingressAclMatch ?? undefined,
          };
          const changedFields = this.diffPacketFields(
            packetBeforeHop,
            workingPacket,
          );
          if (changedFields.length > 0) {
            dropHop.changedFields = changedFields;
          }
          if (natTranslation) {
            dropHop.natTranslation = natTranslation;
          }
          stepCounter = this.traceRecorder.appendHop(
            hops,
            snapshots,
            this.withPacketMacs(dropHop, workingPacket),
            workingPacket,
            stepCounter,
          );
          break;
        }

        const aclProcessor = this.services.getAclProcessor(current);
        if (aclProcessor) {
          const egressResult = aclProcessor.applyEgress(
            workingPacket,
            hopBase.egressInterfaceId,
            stepCounter,
          );
          egressAclMatch = egressResult.match;
          if (egressResult.dropReason) {
            const dropHop: Omit<PacketHop, "step"> = {
              ...hopBase,
              event: "drop",
              reason: egressResult.dropReason,
              routingDecision: hopBase.routingDecision,
              aclMatch: egressResult.match ?? undefined,
            };
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            const changedFields = this.diffPacketFields(
              packetBeforeHop,
              egressResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(dropHop, egressResult.packet),
              egressResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = egressResult.packet;
        }

        const natProcessor = this.services.getNatProcessor(current);
        if (natProcessor) {
          const postRoutingResult = natProcessor.applyPostRouting(
            workingPacket,
            hopBase.ingressInterfaceId,
            hopBase.egressInterfaceId,
            stepCounter,
            outsideToInsideMatched,
          );
          if (postRoutingResult.dropReason) {
            const dropHop: Omit<PacketHop, "step"> = {
              ...hopBase,
              event: "drop",
              reason: postRoutingResult.dropReason,
              routingDecision: hopBase.routingDecision,
              aclMatch: egressAclMatch ?? ingressAclMatch ?? undefined,
            };
            if (postRoutingResult.translation ?? natTranslation) {
              dropHop.natTranslation =
                postRoutingResult.translation ?? natTranslation ?? undefined;
            }
            const changedFields = this.diffPacketFields(
              packetBeforeHop,
              postRoutingResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(dropHop, postRoutingResult.packet),
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
        node.data.role === "router" ||
        node.data.role === "client" ||
        node.data.role === "server"
          ? this.resolveArpTargetInfo(
              current,
              next.nodeId,
              workingPacket,
              failureState,
              routerEgressInterface?.id,
              next.edgeId,
              selectedRoute?.nextHop,
            )
          : null;
      const shouldInjectArp =
        arpTarget !== null && !arpCache.has(arpTarget.targetIp);

      if (shouldInjectArp && ingressFrom === null) {
        const createHop: Omit<PacketHop, "step"> = {
          ...hopBase,
          event: "create",
          toNodeId: next.nodeId,
          activeEdgeId: next.edgeId,
        };
        const changedFields = this.diffPacketFields(
          packetBeforeHop,
          workingPacket,
        );
        if (changedFields.length > 0) {
          createHop.changedFields = changedFields;
        }
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.withPacketMacs(createHop, workingPacket),
          workingPacket,
          stepCounter,
        );
      }

      const packetBeforeForward =
        shouldInjectArp && ingressFrom === null
          ? workingPacket
          : packetBeforeHop;

      if (shouldInjectArp && arpTarget) {
        const targetMac = this.resolveArpTargetMac(
          current,
          next.nodeId,
          arpTarget.targetNodeId,
          workingPacket,
          failureState,
          hopBase.egressInterfaceId,
          selectedRoute?.nextHop,
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
        this.recordArpEntry(
          nodeArpTables,
          current,
          arpTarget.targetIp,
          targetMac,
        );
        this.recordArpEntry(
          nodeArpTables,
          arpTarget.targetNodeId,
          arpTarget.senderIp,
          arpTarget.senderMac,
        );
      }

      const forwardEvent =
        ingressFrom === null && !shouldInjectArp ? "create" : "forward";
      const resolvedDstMac = arpTarget
        ? (arpCache.get(arpTarget.targetIp) ??
          this.resolveArpTargetMac(
            current,
            next.nodeId,
            arpTarget.targetNodeId,
            workingPacket,
            failureState,
            hopBase.egressInterfaceId,
            selectedRoute?.nextHop,
          ))
        : this.resolveDstMac(
            current,
            next.nodeId,
            hopBase.egressInterfaceId,
            workingPacket,
            failureState,
            selectedRoute?.nextHop,
          );

      if (node.data.role === "router") {
        const egressIface = this.findLogicalRouterInterfaceById(
          current,
          hopBase.egressInterfaceId,
        );
        const egressEdge = this.topology.edges.find(
          (candidate) => candidate.id === next.edgeId,
        );
        const mtu = effectiveMtu(egressEdge?.data?.mtuBytes, egressIface?.mtu);
        const size = packetSizeBytes(workingPacket.frame.payload);

        if (size > mtu && workingPacket.frame.payload.flags?.df === true) {
          const dropHop: Omit<PacketHop, "step"> = {
            ...hopBase,
            event: "drop",
            reason: "fragmentation-needed",
            routingDecision: hopBase.routingDecision,
            aclMatch: egressAclMatch ?? ingressAclMatch ?? undefined,
            nextHopMtu: mtu,
          };
          if (natTranslation) {
            dropHop.natTranslation = natTranslation;
          }
          const routerIp = hopBase.ingressInterfaceId
            ? this.findLogicalRouterInterfaceById(
                current,
                hopBase.ingressInterfaceId,
              )?.ipAddress
            : this.getEffectiveNodeIp(node);
          if (
            routerIp &&
            !options.suppressGeneratedIcmp &&
            this.shouldEmitGeneratedIcmp(workingPacket.frame.payload.srcIp)
          ) {
            dropHop.icmpGenerated = true;
            generatedIcmpPackets.push(
              this.buildIcmpFragmentationNeeded(
                current,
                routerIp,
                workingPacket,
                mtu,
              ),
            );
          }
          const changedFields = this.diffPacketFields(
            packetBeforeHop,
            workingPacket,
          );
          if (changedFields.length > 0) {
            dropHop.changedFields = changedFields;
          }
          stepCounter = this.traceRecorder.appendHop(
            hops,
            snapshots,
            this.withPacketMacs(dropHop, workingPacket),
            workingPacket,
            stepCounter,
          );
          break;
        }

        if (size > mtu) {
          const identification =
            workingPacket.frame.payload.identification ??
            this.derivePacketIdentification(workingPacket);
          const fragments = fragment(
            workingPacket.frame.payload,
            mtu,
            identification,
          );
          const nextIngressPort = this.resolvePortFromEdge(
            next.nodeId,
            next.edgeId,
            "ingress",
          );
          const fragmentAclMatch =
            egressAclMatch ?? ingressAclMatch ?? undefined;
          senderIp = egressIface?.ipAddress ?? null;

          for (const [fragmentIndex, fragmentPayload] of fragments.entries()) {
            let fragmentPacket: InFlightPacket = {
              ...workingPacket,
              frame: {
                ...workingPacket.frame,
                payload: fragmentPayload,
                srcMac: egressIface?.macAddress ?? workingPacket.frame.srcMac,
                dstMac: resolvedDstMac ?? workingPacket.frame.dstMac,
              },
            };
            fragmentPacket = this.withFrameFcs(
              this.withIpv4HeaderChecksum(fragmentPacket),
            );

            const fragmentHop: Omit<PacketHop, "step"> = {
              ...hopBase,
              event: forwardEvent,
              toNodeId: next.nodeId,
              activeEdgeId: next.edgeId,
              action: "fragment",
              fragmentIndex,
              fragmentCount: fragments.length,
              identification,
              nextHopMtu: mtu,
            };
            if (natTranslation) {
              fragmentHop.natTranslation = natTranslation;
            }
            if (fragmentAclMatch) {
              fragmentHop.aclMatch = fragmentAclMatch;
            }
            const changedFields = this.diffPacketFields(
              packetBeforeForward,
              fragmentPacket,
            );
            if (changedFields.length > 0) {
              fragmentHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.withPacketMacs(fragmentHop, fragmentPacket),
              fragmentPacket,
              stepCounter,
            );

            const forwardedFragment: InFlightPacket = {
              ...fragmentPacket,
              currentDeviceId: next.nodeId,
              ingressPortId:
                nextIngressPort?.id ?? fragmentPacket.ingressPortId,
            };
            const fragmentResult = await this.runForwardingLoop(
              {
                packet: forwardedFragment,
                current: next.nodeId,
                ingressFrom: current,
                ingressEdgeId: next.edgeId,
                senderIp,
                stepCounter,
                baseTs,
                visitedStates: new Set(visitedStates),
              },
              shared,
            );
            stepCounter = fragmentResult.stepCounter;
            generatedIcmpPackets.push(...fragmentResult.generatedIcmpPackets);
          }

          return { stepCounter, generatedIcmpPackets };
        }

        senderIp = egressIface?.ipAddress ?? null;
        workingPacket = this.withFrameFcs({
          ...workingPacket,
          frame: {
            ...workingPacket.frame,
            srcMac: egressIface?.macAddress ?? workingPacket.frame.srcMac,
            dstMac: resolvedDstMac ?? workingPacket.frame.dstMac,
          },
        });
      } else if (node.data.role === "client" || node.data.role === "server") {
        senderIp = this.getEffectiveNodeIp(node) ?? null;
        const resolvedSrcMac = this.resolveEndpointMac(current);
        workingPacket = this.withFrameFcs({
          ...workingPacket,
          frame: {
            ...workingPacket.frame,
            srcMac:
              resolvedSrcMac &&
              this.isPlaceholderMac(workingPacket.frame.srcMac)
                ? resolvedSrcMac
                : workingPacket.frame.srcMac,
            dstMac:
              resolvedDstMac &&
              this.isPlaceholderMac(workingPacket.frame.dstMac)
                ? resolvedDstMac
                : workingPacket.frame.dstMac,
          },
        });
      } else if (node.data.role === "switch") {
        const egressPort = this.resolvePortFromEdge(
          current,
          next.edgeId,
          "egress",
        );
        if (egressPort) {
          hopBase.egressInterfaceId = egressPort.id;
          hopBase.egressInterfaceName = egressPort.name;
        }
      }

      const forwardHop: Omit<PacketHop, "step"> = {
        ...hopBase,
        event: forwardEvent,
        toNodeId: next.nodeId,
        activeEdgeId: next.edgeId,
      };
      if (natTranslation) {
        forwardHop.natTranslation = natTranslation;
      }
      if (egressAclMatch ?? ingressAclMatch) {
        forwardHop.aclMatch = egressAclMatch ?? ingressAclMatch ?? undefined;
      }
      const changedFields = this.diffPacketFields(
        packetBeforeForward,
        workingPacket,
      );
      if (changedFields.length > 0) {
        forwardHop.changedFields = changedFields;
      }

      stepCounter = this.traceRecorder.appendHop(
        hops,
        snapshots,
        this.withPacketMacs(forwardHop, workingPacket),
        workingPacket,
        stepCounter,
      );

      ingressFrom = current;
      ingressEdgeId = next.edgeId;
      const nextIngressPort = this.resolvePortFromEdge(
        next.nodeId,
        next.edgeId,
        "ingress",
      );
      workingPacket = {
        ...workingPacket,
        currentDeviceId: next.nodeId,
        ingressPortId: nextIngressPort?.id ?? workingPacket.ingressPortId,
      };
      current = next.nodeId;
    }

    return { stepCounter, generatedIcmpPackets };
  }

  private async precomputeDetailed(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    options: PrecomputeOptions = {},
  ): Promise<PrecomputeResult> {
    const hops: PacketHop[] = [];
    const snapshots: InFlightPacket[] = [];
    const nodeArpTables: Record<string, Record<string, string>> = {};
    const arpCache = new Map<string, string>();
    const reassemblers = new Map<string, Reassembler>();
    this.seedArpCache(arpCache);
    const baseTs = Date.now();
    const current = packet.srcNodeId;
    const workingPacket = this.materializePacket(
      { ...packet, currentDeviceId: current },
      failureState,
      arpCache,
    );

    const { generatedIcmpPackets } = await this.runForwardingLoop(
      {
        packet: workingPacket,
        current,
        ingressFrom: null,
        ingressEdgeId: null,
        senderIp: null,
        stepCounter: 0,
        baseTs,
        visitedStates: new Set<string>(),
      },
      {
        hops,
        snapshots,
        nodeArpTables,
        arpCache,
        reassemblers,
        failureState,
        options,
      },
    );

    const lastHop = hops[hops.length - 1];
    const status = lastHop?.event === "deliver" ? "delivered" : "dropped";

    let result: PrecomputeResult = {
      trace: {
        packetId: packet.id,
        sessionId: packet.sessionId,
        label: this.traceRecorder.deriveTraceLabel(packet),
        srcNodeId: packet.srcNodeId,
        dstNodeId: packet.dstNodeId,
        hops,
        status,
      },
      nodeArpTables,
      snapshots,
    };

    for (const generatedIcmpPacket of generatedIcmpPackets) {
      const generatedResult = await this.precomputeDetailed(
        generatedIcmpPacket,
        failureState,
        { suppressGeneratedIcmp: true },
      );
      result = this.traceRecorder.mergeResults(result, generatedResult, {
        preservePrimaryStatus: true,
      });
    }

    this.traceRecorder.setSnapshots(packet.id, result.snapshots);
    return result;
  }

  async precompute(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    options: PrecomputeOptions = {},
  ): Promise<PrecomputeResult> {
    return this.precomputeDetailed(packet, failureState, options);
  }

  async ping(
    srcNodeId: string,
    dstIp: string,
    options?: { ttl?: number },
  ): Promise<PrecomputeResult> {
    const srcNode = this.findNode(srcNodeId);
    if (!srcNode) {
      throw new Error(`Node ${srcNodeId} not found`);
    }

    const srcIp = this.getEffectiveNodeIp(srcNode);
    if (!srcIp) {
      throw new Error(`Node ${srcNodeId} has no effective IP`);
    }

    const dstNode = this.findNodeByIp(dstIp);
    const requestPacket = this.buildIcmpEchoRequest(
      srcNodeId,
      dstNode?.id ?? dstIp,
      srcIp,
      dstIp,
      options?.ttl ?? 64,
    );

    let result = await this.precomputeDetailed(
      requestPacket,
      EMPTY_FAILURE_STATE,
    );

    if (result.trace.status === "delivered" && dstNode) {
      const replyPacket = this.buildIcmpEchoReply(
        dstNode.id,
        srcNodeId,
        dstIp,
        srcIp,
        requestPacket,
      );
      const replyResult = await this.precomputeDetailed(
        replyPacket,
        EMPTY_FAILURE_STATE,
      );
      result = this.traceRecorder.mergeResults(result, replyResult);
      this.traceRecorder.setSnapshots(result.trace.packetId, result.snapshots);
    }

    return result;
  }

  async traceroute(
    srcNodeId: string,
    dstIp: string,
    maxHops = 30,
  ): Promise<PrecomputeResult[]> {
    const traces: PrecomputeResult[] = [];
    const dstNode = this.findNodeByIp(dstIp);

    for (let ttl = 1; ttl <= maxHops; ttl++) {
      const traceResult = await this.ping(srcNodeId, dstIp, { ttl });
      traces.push(traceResult);

      if (
        dstNode &&
        traceResult.trace.hops.some(
          (hop) => hop.nodeId === dstNode.id && hop.event === "deliver",
        )
      ) {
        break;
      }
    }

    return traces;
  }
}
