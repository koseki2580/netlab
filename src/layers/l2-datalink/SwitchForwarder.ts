import type { Forwarder, ForwardDecision } from '../../types/layers';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';

const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

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

    // Use the first egress port for the primary forward decision
    // (multi-port flooding is handled by the simulation engine duplicating the packet)
    const egressPort = egressPorts[0];

    // Check if this is the destination
    const connectedEdge = this.topology.edges.find(
      (e) =>
        (e.source === this.nodeId && e.sourceHandle === egressPort) ||
        (e.target === this.nodeId && e.targetHandle === egressPort),
    );

    if (!connectedEdge) {
      return { action: 'drop', reason: `no edge connected to port ${egressPort}` };
    }

    return {
      action: 'forward',
      egressPort,
      packet: { ...packet, egressPortId: egressPort },
    };
  }
}
