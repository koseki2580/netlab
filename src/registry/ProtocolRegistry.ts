import type {
  ProtocolName,
  RoutingProtocol,
  RouteEntry,
  TopologyChangeEvent,
} from '../types/routing';
import type { NetworkTopology } from '../types/topology';

class ProtocolRegistry {
  private protocols = new Map<ProtocolName, RoutingProtocol>();

  register(protocol: RoutingProtocol): void {
    this.protocols.set(protocol.name, protocol);
  }

  unregister(name: ProtocolName): void {
    this.protocols.delete(name);
  }

  /**
   * Compute the best route table across all registered protocols.
   * For each (nodeId, destination) pair, the route with the lowest adminDistance wins.
   * Ties in adminDistance are resolved by lowest metric.
   */
  resolveRouteTable(topology: NetworkTopology): Map<string, RouteEntry[]> {
    const all: RouteEntry[] = [];
    for (const protocol of this.protocols.values()) {
      all.push(...protocol.computeRoutes(topology));
    }

    // Best route per (nodeId, destination)
    const best = new Map<string, RouteEntry>();
    for (const entry of all) {
      const key = `${entry.nodeId}::${entry.destination}`;
      const existing = best.get(key);
      if (!existing) {
        best.set(key, entry);
        continue;
      }
      if (entry.adminDistance < existing.adminDistance) {
        best.set(key, entry);
        continue;
      }
      if (
        entry.adminDistance === existing.adminDistance &&
        entry.metric < existing.metric
      ) {
        best.set(key, entry);
      }
    }

    // Group by nodeId
    const result = new Map<string, RouteEntry[]>();
    for (const entry of best.values()) {
      const list = result.get(entry.nodeId) ?? [];
      list.push(entry);
      result.set(entry.nodeId, list);
    }

    return result;
  }

  notifyTopologyChange(event: TopologyChangeEvent): void {
    for (const protocol of this.protocols.values()) {
      protocol.onTopologyChange?.(event);
    }
  }

  list(): ProtocolName[] {
    return Array.from(this.protocols.keys());
  }
}

export const protocolRegistry = new ProtocolRegistry();
