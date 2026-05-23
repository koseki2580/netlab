import type { HookEngine } from '../hooks/HookEngine';
import type { InFlightPacket } from '../types/packets';
import type { PacketHop } from '../types/simulation';

export class HookEmitter {
  constructor(private readonly hookEngine: HookEngine) {}

  emitForHop(hop: PacketHop, packet: InFlightPacket): void {
    switch (hop.event) {
      case 'create':
        void this.hookEngine.emit('packet:create', {
          packet,
          sourceNodeId: hop.nodeId,
        });
        break;
      case 'forward':
        void this.hookEngine.emit('packet:forward', {
          packet,
          fromNodeId: hop.fromNodeId ?? hop.nodeId,
          toNodeId: hop.toNodeId ?? '',
          decision: {
            action: 'forward',
            nextNodeId: hop.toNodeId ?? '',
            edgeId: hop.activeEdgeId ?? '',
            egressPort: hop.egressInterfaceId ?? hop.activeEdgeId ?? '',
            packet,
            ...(hop.egressInterfaceId !== undefined
              ? { egressInterfaceId: hop.egressInterfaceId }
              : {}),
          },
        });
        break;
      case 'deliver':
        void this.hookEngine.emit('packet:deliver', {
          packet,
          destinationNodeId: hop.nodeId,
        });
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
}
