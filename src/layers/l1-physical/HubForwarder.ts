import type { ForwardContext, ForwardDecision, Forwarder } from '../../types/layers';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology, SwitchPort } from '../../types/topology';

export class HubForwarder implements Forwarder {
  constructor(
    private readonly nodeId: string,
    private readonly topology: NetworkTopology,
  ) {}

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
    const edge = this.topology.edges.find((candidate) => candidate.id === edgeId);
    if (!edge) return undefined;
    if (edge.source === this.nodeId) return edge.sourceHandle ?? undefined;
    if (edge.target === this.nodeId) return edge.targetHandle ?? undefined;
    return undefined;
  }

  forward(ingressPortId: string, ports: readonly SwitchPort[]): string[] {
    return ports.filter((port) => port.id !== ingressPortId).map((port) => port.id);
  }

  async receive(
    packet: InFlightPacket,
    ingressPortId: string,
    ctx: ForwardContext,
  ): Promise<ForwardDecision> {
    const node = this.topology.nodes.find((candidate) => candidate.id === this.nodeId);
    if (!node) {
      return { action: 'drop', reason: `hub node ${this.nodeId} not found` };
    }

    const ports = (node.data.ports ?? []) as SwitchPort[];
    const egressPorts = this.forward(ingressPortId, ports);
    if (egressPorts.length === 0) {
      return { action: 'drop', reason: 'hub-no-egress-port' };
    }

    const neighbor =
      ctx.neighbors.find((candidate) => {
        const portId = this.resolvePortForEdge(candidate.edgeId);
        return portId !== undefined && egressPorts.includes(portId);
      }) ?? null;
    if (!neighbor) {
      return { action: 'drop', reason: 'hub-no-egress-neighbor' };
    }

    const egressPort = this.resolvePortForEdge(neighbor.edgeId) ?? egressPorts[0];
    if (!egressPort) {
      return { action: 'drop', reason: 'hub-no-egress-port' };
    }
    const connectedEdge = this.resolveConnectedEdgeForPort(egressPort);
    if (!connectedEdge) {
      return { action: 'drop', reason: `no edge connected to port ${egressPort}` };
    }

    return {
      action: 'forward',
      nextNodeId: neighbor.nodeId,
      edgeId: connectedEdge.id,
      egressPort,
      packet: { ...packet, egressPortId: egressPort },
    };
  }
}
