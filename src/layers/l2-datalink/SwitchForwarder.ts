import type {
  ForwardContext,
  ForwardDecision,
  Forwarder,
} from "../../types/layers";
import { IGMP_PROTOCOL, isLinkLocalMulticast } from "../../types/multicast";
import type { IgmpMessage, InFlightPacket } from "../../types/packets";
import type { NetworkTopology, SwitchPort } from "../../types/topology";
import { ipToMulticastMac, isMulticastMac } from "../../utils/multicastMac";
import { MulticastTable } from "./MulticastTable";
import {
  isVlanAllowedOnPort,
  prepareEgressFrame,
  resolveIngressVlan,
} from "./vlan";

const BROADCAST_MAC = "ff:ff:ff:ff:ff:ff";
const BROADCAST_IP = "255.255.255.255";

export class SwitchForwarder implements Forwarder {
  private macTable = new Map<string, string>(); // MAC → portId
  private readonly multicastTable = new MulticastTable();
  private readonly nodeId: string;
  private readonly topology: NetworkTopology;

  constructor(nodeId: string, topology: NetworkTopology) {
    this.nodeId = nodeId;
    this.topology = topology;
  }

  getMacTable(): ReadonlyMap<string, string> {
    return this.macTable;
  }

  getMulticastTable(): MulticastTable {
    return this.multicastTable;
  }

  private macKey(vlanId: number, mac: string): string {
    return `${vlanId}:${mac}`;
  }

  private resolvePortConfig(ports: SwitchPort[], portId: string): SwitchPort {
    return (
      ports.find((port) => port.id === portId) ?? {
        id: portId,
        name: portId,
        macAddress: "",
      }
    );
  }

  learn(srcMac: string, ingressPortId: string, vlanId: number): void {
    this.macTable.set(this.macKey(vlanId, srcMac), ingressPortId);
  }

  private resolveConnectedEdgeForPort(portId: string) {
    return (
      this.topology.edges.find(
        (edge) =>
          (edge.source === this.nodeId && edge.sourceHandle === portId) ||
          (edge.target === this.nodeId && edge.targetHandle === portId),
      ) ?? null
    );
  }

  private resolvePortForEdge(edgeId: string): string | undefined {
    const edge = this.topology.edges.find(
      (candidate) => candidate.id === edgeId,
    );
    if (!edge) return undefined;
    if (edge.source === this.nodeId) return edge.sourceHandle ?? undefined;
    if (edge.target === this.nodeId) return edge.targetHandle ?? undefined;
    return undefined;
  }

  private isPortForwarding(portId: string): boolean {
    const state = this.topology.stpStates?.get(
      `${this.nodeId}:${portId}`,
    )?.state;
    return state === undefined || state === "FORWARDING";
  }

  private selectNeighbor(
    packet: InFlightPacket,
    neighbors: ForwardContext["neighbors"],
  ) {
    const dstMac = packet.frame.dstMac.toLowerCase();
    const dstIp =
      packet.frame.payload.dstIp === BROADCAST_IP
        ? null
        : packet.frame.payload.dstIp;

    for (const neighbor of neighbors) {
      const egressPortId = this.resolvePortForEdge(neighbor.edgeId);
      if (egressPortId && !this.isPortForwarding(egressPortId)) {
        continue;
      }
      const node = this.topology.nodes.find(
        (candidate) => candidate.id === neighbor.nodeId,
      );
      if (!node) continue;
      const neighborMacs = [
        typeof node.data.mac === "string" ? node.data.mac : null,
        ...(node.data.interfaces ?? []).map((iface) => iface.macAddress),
      ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase());
      if (neighborMacs.includes(dstMac)) {
        return neighbor;
      }
    }

    for (const neighbor of neighbors) {
      const egressPortId = this.resolvePortForEdge(neighbor.edgeId);
      if (egressPortId && !this.isPortForwarding(egressPortId)) {
        continue;
      }
      const node = this.topology.nodes.find(
        (candidate) => candidate.id === neighbor.nodeId,
      );
      if (!node) continue;
      if (packet.dstNodeId && node.id === packet.dstNodeId) return neighbor;
      if (
        dstIp &&
        (node.data.ip === dstIp ||
          (node.data.interfaces ?? []).some(
            (iface) => iface.ipAddress === dstIp,
          ))
      ) {
        return neighbor;
      }
    }

    for (const neighbor of neighbors) {
      const egressPortId = this.resolvePortForEdge(neighbor.edgeId);
      if (!egressPortId || this.isPortForwarding(egressPortId)) {
        return neighbor;
      }
    }

    return null;
  }

  forward(
    dstMac: string,
    ingressPortId: string,
    ports: SwitchPort[],
    vlanId: number,
    dstIp?: string,
    externalMulticastTable?: MulticastTable,
  ): string[] {
    const eligiblePortIds = ports
      .filter((port) => port.id !== ingressPortId)
      .filter((port) => this.isPortForwarding(port.id))
      .filter((port) => isVlanAllowedOnPort(port, vlanId))
      .map((port) => port.id);

    if (dstMac === BROADCAST_MAC) {
      return eligiblePortIds;
    }

    // Multicast branch: consult MulticastTable (persistent table takes priority)
    if (isMulticastMac(dstMac)) {
      const table = externalMulticastTable ?? this.multicastTable;
      // Link-local (224.0.0.0/24) is always flooded
      if (dstIp && isLinkLocalMulticast(dstIp)) {
        return eligiblePortIds;
      }
      if (table.hasLearnedGroup(vlanId, dstMac)) {
        const joinedPorts = table.getJoinedPorts(vlanId, dstMac);
        return eligiblePortIds.filter((portId) => joinedPorts.has(portId));
      }
      // Unlearned group → flood within VLAN
      return eligiblePortIds;
    }

    const known = this.macTable.get(this.macKey(vlanId, dstMac));
    if (known) {
      return eligiblePortIds.includes(known) ? [known] : eligiblePortIds;
    }
    // Unknown unicast: flood
    return eligiblePortIds;
  }

  async receive(
    packet: InFlightPacket,
    ingressPortId: string,
    ctx: ForwardContext,
  ): Promise<ForwardDecision> {
    const node = this.topology.nodes.find((n) => n.id === this.nodeId);
    if (!node) {
      return { action: "drop", reason: `switch node ${this.nodeId} not found` };
    }

    if (!this.isPortForwarding(ingressPortId)) {
      return { action: "drop", reason: "stp-port-blocked" };
    }

    const frame = packet.frame;
    const ports = (node.data.ports ?? []) as SwitchPort[];
    const ingressPort = this.resolvePortConfig(ports, ingressPortId);
    const vlanId = resolveIngressVlan(ingressPort, frame);

    if (vlanId === null) {
      return { action: "drop", reason: "vlan-ingress-violation" };
    }

    this.learn(frame.srcMac, ingressPortId, vlanId);

    // IGMP snooping: learn from transit IGMP Reports and Leaves
    const isIgmpControl = this.snoopIgmp(frame, ingressPortId, vlanId);

    // IGMP control messages are always flooded (snooping is transparent)
    const effectiveDstMac = isIgmpControl ? BROADCAST_MAC : frame.dstMac;
    const egressPorts = this.forward(
      effectiveDstMac,
      ingressPortId,
      ports,
      vlanId,
      frame.payload.dstIp,
      ctx.multicastTable,
    );

    if (egressPorts.length === 0) {
      return { action: "drop", reason: "no-egress-in-vlan" };
    }

    const learnedPort = this.macTable.get(this.macKey(vlanId, frame.dstMac));
    if (learnedPort && this.isPortForwarding(learnedPort)) {
      const learnedEdge = this.resolveConnectedEdgeForPort(learnedPort);
      if (learnedEdge) {
        const nextNodeId =
          learnedEdge.source === this.nodeId
            ? learnedEdge.target
            : learnedEdge.source;
        const egressPort = this.resolvePortConfig(ports, learnedPort);
        return {
          action: "forward",
          nextNodeId,
          edgeId: learnedEdge.id,
          egressPort: learnedPort,
          packet: {
            ...packet,
            egressPortId: learnedPort,
            vlanId,
            frame: prepareEgressFrame(frame, egressPort, vlanId),
          },
        };
      }
    }

    const selectedNeighbor = this.selectNeighbor(packet, ctx.neighbors);
    if (selectedNeighbor) {
      const resolvedEgressPortId = this.resolvePortForEdge(
        selectedNeighbor.edgeId,
      );
      const egressPortId = resolvedEgressPortId ?? egressPorts[0];
      if (!egressPortId || !egressPorts.includes(egressPortId)) {
        return { action: "drop", reason: "no-egress-in-vlan" };
      }
      const egressPort = this.resolvePortConfig(ports, egressPortId);
      return {
        action: "forward",
        nextNodeId: selectedNeighbor.nodeId,
        edgeId: selectedNeighbor.edgeId,
        egressPort: egressPortId,
        packet: {
          ...packet,
          egressPortId: egressPortId,
          vlanId,
          frame: prepareEgressFrame(frame, egressPort, vlanId),
        },
      };
    }

    const fallbackEgressPortId = egressPorts[0];
    const connectedEdge =
      this.resolveConnectedEdgeForPort(fallbackEgressPortId);

    if (connectedEdge) {
      const nextNodeId =
        connectedEdge.source === this.nodeId
          ? connectedEdge.target
          : connectedEdge.source;
      const egressPort = this.resolvePortConfig(ports, fallbackEgressPortId);

      return {
        action: "forward",
        nextNodeId,
        edgeId: connectedEdge.id,
        egressPort: fallbackEgressPortId,
        packet: {
          ...packet,
          egressPortId: fallbackEgressPortId,
          vlanId,
          frame: prepareEgressFrame(frame, egressPort, vlanId),
        },
      };
    }

    return {
      action: "drop",
      reason: `no edge connected to port ${fallbackEgressPortId}`,
    };
  }

  /** Snoop on IGMP Reports and Leaves. Returns true if the frame is an IGMP control message. */
  private snoopIgmp(
    frame: InFlightPacket["frame"],
    ingressPortId: string,
    vlanId: number,
  ): boolean {
    const ip = frame.payload;
    if (ip.protocol !== IGMP_PROTOCOL) return false;
    const payload = ip.payload;
    if (!("igmpType" in payload)) return false;
    const igmp = payload as IgmpMessage;
    const groupMac = ipToMulticastMac(
      igmp.groupAddress === "0.0.0.0" ? "224.0.0.1" : igmp.groupAddress,
    );

    if (igmp.igmpType === "v2-membership-report") {
      this.multicastTable.addMembership(vlanId, groupMac, ingressPortId);
    } else if (igmp.igmpType === "v2-leave-group") {
      this.multicastTable.removeMembership(vlanId, groupMac, ingressPortId);
    }
    return true;
  }
}
