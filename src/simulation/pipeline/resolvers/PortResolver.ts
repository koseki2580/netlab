import type { InFlightPacket } from '../../../types/packets';
import type { NetworkTopology } from '../../../types/topology';
import type { ResolvedInterface } from './InterfaceResolver';

export class PortResolver {
  constructor(private readonly topology: NetworkTopology) {}

  resolvePortFromEdge(
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

  getForwardingVlanId(packet: InFlightPacket): number {
    return packet.vlanId ?? packet.frame.vlanTag?.vid ?? 0;
  }
}
