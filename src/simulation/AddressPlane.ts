import type { NetlabNode, NetworkTopology } from '../types/topology';
import { interfaceMatchesTarget, logicalInterfaces } from '../layers/l3-network/logicalInterfaces';
import { reservedAddressKind } from '../utils/cidr';
import { canonicalizeIpv6, isIpv6Address } from '../utils/ipv6';
import { deriveDeterministicMac } from '../utils/network';
import { nodeOwnsIp, primaryNodeIp, type AddressView } from './addressView';

export { nodeOwnsIp } from './addressView';

/** Where addresses leased at run time (DHCP) are read from. */
export interface RuntimeAddressSource {
  getRuntimeNodeIp(nodeId: string): string | null;
}

/**
 * MACs that stand for "not configured": all zeros, and the two values packet
 * builders put in a frame before the pipeline resolves the real ones.
 */
export function isPlaceholderMac(mac: string): boolean {
  const normalized = mac.trim().toLowerCase();
  return (
    normalized === '00:00:00:00:00:00' ||
    normalized === '00:00:00:00:00:01' ||
    normalized === '00:00:00:00:00:02'
  );
}

/**
 * Whether a router interface was given the network or broadcast address of its
 * own prefix. No device may hold either, so the engine refuses the interface:
 * it owns nothing, and what would cross it is dropped as `reserved-address`.
 */
export function isReservedInterface(iface: { ipAddress: string; prefixLength: number }): boolean {
  return (
    iface.ipAddress !== '' && reservedAddressKind(iface.ipAddress, iface.prefixLength) !== null
  );
}

/** Two spellings of one address, IPv6 compared in canonical form. */
export function sameAddress(left: string | undefined, right: string): boolean {
  if (left === undefined) return false;
  if (left === right) return true;
  return isIpv6Address(right) && isIpv6Address(left)
    ? canonicalizeIpv6(left) === canonicalizeIpv6(right)
    : false;
}

/**
 * The one answer to "what is this node's address, who owns address x, what is
 * this node's MAC". Static addresses come from the topology; leased ones from
 * the runtime source. It holds no state of its own, so a lease shows up here
 * the moment it is granted and disappears when the leases are cleared.
 */
export class AddressPlane implements AddressView {
  constructor(
    private readonly topology: NetworkTopology,
    private readonly runtime: RuntimeAddressSource | null = null,
  ) {}

  findNode(nodeId: string): NetlabNode | null {
    return this.topology.nodes.find((candidate) => candidate.id === nodeId) ?? null;
  }

  nodeIp(node: NetlabNode | null): string | undefined {
    if (!node) return undefined;
    return this.runtime?.getRuntimeNodeIp(node.id) ?? node.data.ip;
  }

  /** `nodeIp`, falling back to the first interface's address (routers). */
  primaryIp(node: NetlabNode | null): string | null {
    return primaryNodeIp(this, node);
  }

  ownsIp(node: NetlabNode, ip: string): boolean {
    if (
      logicalInterfaces(node).some((iface) => iface.ipAddress === ip && isReservedInterface(iface))
    ) {
      return false;
    }
    return nodeOwnsIp(node, ip, this.nodeIp(node), sameAddress);
  }

  /**
   * Whether a host's address is the network or broadcast address of its LAN.
   * A host carries no prefix of its own, so the prefix is that of the router
   * interface whose network the address is on. Without one, nothing is refused.
   */
  hasReservedAddress(node: NetlabNode): boolean {
    if (node.data.role !== 'client' && node.data.role !== 'server') return false;
    const ip = this.nodeIp(node);
    if (!ip || isIpv6Address(ip)) return false;
    for (const router of this.topology.nodes) {
      const lan = logicalInterfaces(router).find(
        (iface) => !isReservedInterface(iface) && interfaceMatchesTarget(iface, ip),
      );
      if (lan) return reservedAddressKind(ip, lan.prefixLength) !== null;
    }
    return false;
  }

  findOwner(ip: string): NetlabNode | null {
    return this.topology.nodes.find((node) => this.ownsIp(node, ip)) ?? null;
  }

  /** The node's own `mac`, unless it is missing or a placeholder. */
  configuredMac(node: NetlabNode): string | null {
    const mac = node.data.mac;
    return typeof mac === 'string' && mac.length > 0 && !isPlaceholderMac(mac) ? mac : null;
  }

  /** A host's MAC: the configured one, else one derived from its id. */
  endpointMac(node: NetlabNode): string {
    return this.configuredMac(node) ?? deriveDeterministicMac(node.id);
  }
}
