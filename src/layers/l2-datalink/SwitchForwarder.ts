import type { ForwardContext, ForwardDecision, Forwarder } from '../../types/layers';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology, SwitchPort } from '../../types/topology';
import {
  isVlanAllowedOnPort,
  prepareEgressFrame,
  resolveIngressVlan,
} from './vlan';

const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';
const BROADCAST_IP = '255.255.255.255';

export class SwitchForwarder implements Forwarder {
  private macTable = new Map<string, string>(); // MAC → portId
  private readonly nodeId: string;
  private readonly topology: NetworkTopology;

  constructor(nodeId: string, topology: NetworkTopology) {
    this.nodeId = nodeId;
    this.topology = topology;
  }

  getMacTable(): ReadonlyMap<string, string> {
    return this.macTable;
  }

  private macKey(vlanId: number, mac: string): string {
    return `${vlanId}:${mac}`;
  }

  private resolvePortConfig(ports: SwitchPort[], portId: string): SwitchPort {
    return ports.find((port) => port.id === portId) ?? {
      id: portId,
      name: portId,
      macAddress: '',
    };
  }

  learn(srcMac: string, ingressPortId: string, vlanId: number): void {
    this.macTable.set(this.macKey(vlanId, srcMac), ingressPortId);
  }

  private resolveConnectedEdgeForPort(portId: string) {
    return this.topology.edges.find(
      (edge) =>
        (edge.source === this.nodeId && edge.sourceHandle === portId) ||
        (edge.target === this.nodeId && edge.targetHandle === portId),
    ) ?? null;
  }

  private resolvePortForEdge(edgeId: string): string | undefined {
    const edge = this.topology.edges.find((candidate) => candidate.id === edgeId);
    if (!edge) return undefined;
    if (edge.source === this.nodeId) return edge.sourceHandle ?? undefined;
    if (edge.target === this.nodeId) return edge.targetHandle ?? undefined;
    return undefined;
  }

  private isPortForwarding(portId: string): boolean {
    const state = this.topology.stpStates?.get(`${this.nodeId}:${portId}`)?.state;
    return state === undefined || state === 'FORWARDING';
  }

  private selectNeighbor(
    packet: InFlightPacket,
    neighbors: ForwardContext['neighbors'],
  ) {
    const dstMac = packet.frame.dstMac.toLowerCase();
    const dstIp = packet.frame.payload.dstIp === BROADCAST_IP
      ? null
      : packet.frame.payload.dstIp;

    for (const neighbor of neighbors) {
      const egressPortId = this.resolvePortForEdge(neighbor.edgeId);
      if (egressPortId && !this.isPortForwarding(egressPortId)) {
        continue;
      }
      const node = this.topology.nodes.find((candidate) => candidate.id === neighbor.nodeId);
      if (!node) continue;
      const neighborMacs = [
        typeof node.data.mac === 'string' ? node.data.mac : null,
        ...(node.data.interfaces ?? []).map((iface) => iface.macAddress),
      ]
        .filter((value): value is string => typeof value === 'string')
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
      const node = this.topology.nodes.find((candidate) => candidate.id === neighbor.nodeId);
      if (!node) continue;
      if (packet.dstNodeId && node.id === packet.dstNodeId) return neighbor;
      if (
        dstIp &&
        (
          node.data.ip === dstIp ||
          (node.data.interfaces ?? []).some((iface) => iface.ipAddress === dstIp)
        )
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
  ): string[] {
    const eligiblePortIds = ports
      .filter((port) => port.id !== ingressPortId)
      .filter((port) => this.isPortForwarding(port.id))
      .filter((port) => isVlanAllowedOnPort(port, vlanId))
      .map((port) => port.id);

    if (dstMac === BROADCAST_MAC) {
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
      return { action: 'drop', reason: `switch node ${this.nodeId} not found` };
    }

    if (!this.isPortForwarding(ingressPortId)) {
      return { action: 'drop', reason: 'stp-port-blocked' };
    }

    const frame = packet.frame;
    const ports = (node.data.ports ?? []) as SwitchPort[];
    const ingressPort = this.resolvePortConfig(ports, ingressPortId);
    const vlanId = resolveIngressVlan(ingressPort, frame);

    if (vlanId === null) {
      return { action: 'drop', reason: 'vlan-ingress-violation' };
    }

    this.learn(frame.srcMac, ingressPortId, vlanId);

    const egressPorts = this.forward(frame.dstMac, ingressPortId, ports, vlanId);

    if (egressPorts.length === 0) {
      return { action: 'drop', reason: 'no-egress-in-vlan' };
    }

    const learnedPort = this.macTable.get(this.macKey(vlanId, frame.dstMac));
    if (learnedPort && this.isPortForwarding(learnedPort)) {
      const learnedEdge = this.resolveConnectedEdgeForPort(learnedPort);
      if (learnedEdge) {
        const nextNodeId =
          learnedEdge.source === this.nodeId ? learnedEdge.target : learnedEdge.source;
        const egressPort = this.resolvePortConfig(ports, learnedPort);
        return {
          action: 'forward',
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
      const resolvedEgressPortId = this.resolvePortForEdge(selectedNeighbor.edgeId);
      const egressPortId = resolvedEgressPortId ?? egressPorts[0];
      if (!egressPortId || !egressPorts.includes(egressPortId)) {
        return { action: 'drop', reason: 'no-egress-in-vlan' };
      }
      const egressPort = this.resolvePortConfig(ports, egressPortId);
      return {
        action: 'forward',
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
    const connectedEdge = this.resolveConnectedEdgeForPort(fallbackEgressPortId);

    if (connectedEdge) {
      const nextNodeId =
        connectedEdge.source === this.nodeId
          ? connectedEdge.target
          : connectedEdge.source;
      const egressPort = this.resolvePortConfig(ports, fallbackEgressPortId);

      return {
        action: 'forward',
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

    return { action: 'drop', reason: `no edge connected to port ${fallbackEgressPortId}` };
  }
}
