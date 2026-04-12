import type { ForwardContext, ForwardDecision, Forwarder } from '../../types/layers';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';

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

  learn(srcMac: string, ingressPortId: string): void {
    this.macTable.set(srcMac, ingressPortId);
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

  private selectNeighbor(
    packet: InFlightPacket,
    neighbors: ForwardContext['neighbors'],
  ) {
    const dstIp = packet.frame.payload.dstIp === BROADCAST_IP
      ? null
      : packet.frame.payload.dstIp;

    for (const neighbor of neighbors) {
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

    return neighbors[0] ?? null;
  }

  forward(
    dstMac: string,
    ingressPortId: string,
    allPortIds: string[],
  ): string[] {
    if (dstMac === BROADCAST_MAC) {
      return allPortIds.filter((p) => p !== ingressPortId);
    }
    const known = this.macTable.get(dstMac);
    if (known) {
      return [known];
    }
    // Unknown unicast: flood
    return allPortIds.filter((p) => p !== ingressPortId);
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

    const frame = packet.frame;
    this.learn(frame.srcMac, ingressPortId);

    const ports = (node.data.ports ?? []) as Array<{ id: string }>;
    const allPortIds = ports.map((p) => p.id);
    const egressPorts = this.forward(frame.dstMac, ingressPortId, allPortIds);

    if (egressPorts.length === 0) {
      return { action: 'drop', reason: 'no egress port found' };
    }

    const learnedPort = this.macTable.get(frame.dstMac);
    if (learnedPort) {
      const learnedEdge = this.resolveConnectedEdgeForPort(learnedPort);
      if (learnedEdge) {
        const nextNodeId =
          learnedEdge.source === this.nodeId ? learnedEdge.target : learnedEdge.source;
        return {
          action: 'forward',
          nextNodeId,
          edgeId: learnedEdge.id,
          egressPort: learnedPort,
          packet: { ...packet, egressPortId: learnedPort },
        };
      }
    }

    const selectedNeighbor = this.selectNeighbor(packet, ctx.neighbors);
    if (selectedNeighbor) {
      return {
        action: 'forward',
        nextNodeId: selectedNeighbor.nodeId,
        edgeId: selectedNeighbor.edgeId,
        egressPort: this.resolvePortForEdge(selectedNeighbor.edgeId) ?? egressPorts[0],
        packet: {
          ...packet,
          egressPortId: this.resolvePortForEdge(selectedNeighbor.edgeId) ?? egressPorts[0],
        },
      };
    }

    const egressPort = egressPorts[0];
    const connectedEdge = this.resolveConnectedEdgeForPort(egressPort);

    if (connectedEdge) {
      const nextNodeId =
        connectedEdge.source === this.nodeId
          ? connectedEdge.target
          : connectedEdge.source;

      return {
        action: 'forward',
        nextNodeId,
        edgeId: connectedEdge.id,
        egressPort,
        packet: { ...packet, egressPortId: egressPort },
      };
    }

    return { action: 'drop', reason: `no edge connected to port ${egressPort}` };
  }
}
