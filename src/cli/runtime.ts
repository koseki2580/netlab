import '../layers/registerForwarders';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import { getConnectedNetworks } from '../routing/graphBuilder';
import { bgpProtocol } from '../routing/bgp/BgpProtocol';
import { ospfProtocol } from '../routing/ospf/OspfProtocol';
import { ospfV3Protocol } from '../routing/ospf/OspfV3Protocol';
import { ripProtocol } from '../routing/rip/RipProtocol';
import { staticProtocol } from '../routing/static/StaticProtocol';
import type { RouteEntry } from '../types/routing';
import type { NetworkTopology } from '../types/topology';

export function ensureCliRuntimeRegistered(): void {
  const registered = new Set(protocolRegistry.list());

  if (!registered.has(staticProtocol.name)) {
    protocolRegistry.register(staticProtocol);
  }
  if (!registered.has(ospfProtocol.name)) {
    protocolRegistry.register(ospfProtocol);
  }
  if (!registered.has(ospfV3Protocol.name)) {
    protocolRegistry.register(ospfV3Protocol);
  }
  if (!registered.has(bgpProtocol.name)) {
    protocolRegistry.register(bgpProtocol);
  }
  if (!registered.has(ripProtocol.name)) {
    protocolRegistry.register(ripProtocol);
  }
}

export function enrichTopology(topology: NetworkTopology): NetworkTopology {
  ensureCliRuntimeRegistered();
  const cloned = structuredClone(topology) as NetworkTopology;
  const routableTopology = {
    ...cloned,
    edges: cloned.edges.filter((edge) => edge.data?.state !== 'down'),
  };
  const routeTables = protocolRegistry.resolveRouteTable(routableTopology);

  for (const node of cloned.nodes) {
    if (node.data.role !== 'router') continue;
    const existing = routeTables.get(node.id) ?? [];
    const connected: RouteEntry[] = getConnectedNetworks(node).map((network) => ({
      destination: network.cidr,
      nextHop: 'direct',
      metric: 0,
      protocol: 'connected',
      adminDistance: 0,
      nodeId: node.id,
    }));
    routeTables.set(node.id, mergeRoutes(existing, connected));
  }

  return {
    ...cloned,
    routeTables,
  };
}

function mergeRoutes(
  existing: readonly RouteEntry[],
  connected: readonly RouteEntry[],
): RouteEntry[] {
  const byKey = new Map<string, RouteEntry>();
  for (const route of [...connected, ...existing]) {
    const key = `${route.destination}::${route.nextHop}`;
    if (!byKey.has(key)) {
      byKey.set(key, route);
    }
  }
  return [...byKey.values()].sort(
    (left, right) =>
      left.destination.localeCompare(right.destination) ||
      left.nextHop.localeCompare(right.nextHop),
  );
}
