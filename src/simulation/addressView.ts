import type { NetlabNode, NetworkTopology } from '../types/topology';

/**
 * What forwarders and the TCP orchestrator need to know about addresses. The
 * engine's `AddressPlane` implements it; this module stays free of the plane's
 * heavier helpers (the IPv6 parser, MAC derivation) so the layer entry points
 * that import it stay small.
 */
export interface AddressView {
  /** The IPv4 address a node speaks from: its DHCP lease, else its static `ip`. */
  nodeIp(node: NetlabNode | null): string | undefined;
  /** Whether `ip` is one of `node`'s addresses. */
  ownsIp(node: NetlabNode, ip: string): boolean;
}

/**
 * The one ownership rule: `ip` is the address the node speaks from
 * (`effectiveIp`), its IPv6 address, or an address on one of its interfaces or
 * sub-interfaces. `same` decides whether two IPv6 spellings are one address.
 */
export function nodeOwnsIp(
  node: NetlabNode,
  ip: string,
  effectiveIp: string | undefined,
  same: (left: string | undefined, right: string) => boolean = (left, right) => left === right,
): boolean {
  if (effectiveIp === ip) return true;
  if (same(node.data.ipv6, ip)) return true;
  return (node.data.interfaces ?? []).some((iface) =>
    [iface, ...(iface.subInterfaces ?? [])].some(
      (address) => address.ipAddress === ip || same(address.ipv6Address, ip),
    ),
  );
}

/** `view.nodeIp`, falling back to the first interface's address (routers). */
export function primaryNodeIp(view: AddressView, node: NetlabNode | null): string | null {
  if (!node) return null;
  const ip = view.nodeIp(node);
  if (typeof ip === 'string' && ip.length > 0) return ip;
  return node.data.interfaces?.[0]?.ipAddress ?? null;
}

const views = new WeakMap<NetworkTopology, AddressView>();

/**
 * A shallow copy of `topology` that carries `view`, for one forwarder call.
 * Forwarders are built by layer plugins from `(nodeId, topology)` alone, so this
 * is how a router learns a host's leased address without that public factory
 * signature changing. The copy is the key, never the caller's object: engines
 * built from one topology object each hand their own view to their own
 * forwarders, and the copy sees the topology as it is at that moment.
 */
export function topologyWithAddressView(
  topology: NetworkTopology,
  view: AddressView,
): NetworkTopology {
  const own = { ...topology };
  views.set(own, view);
  return own;
}

/**
 * The view `topology` carries; for a topology not handed over by an engine, one that knows
 * static addresses only and compares IPv6 spellings exactly.
 */
export function addressViewOf(topology: NetworkTopology): AddressView {
  return (
    views.get(topology) ?? {
      nodeIp: (node) => node?.data.ip,
      ownsIp: (node, ip) => nodeOwnsIp(node, ip, node.data.ip),
    }
  );
}
