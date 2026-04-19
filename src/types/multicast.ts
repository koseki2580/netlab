/**
 * IGMPv2 + Multicast types for educational network simulation.
 *
 * RFC 2236 (IGMPv2) subset: Membership Query, Membership Report, Leave Group.
 * RFC 1112 §6.4: IP-to-Ethernet multicast MAC derivation.
 */

/** IGMP protocol number in IPv4 header. */
export const IGMP_PROTOCOL = 2;

/** Class D multicast address range prefix. */
export const MULTICAST_IP_PREFIX = '224.0.0.0/4';

/** Link-local multicast prefix — always flooded, never snooped. */
export const MULTICAST_LINK_LOCAL_PREFIX = '224.0.0.0/24';

/** All Hosts group (General Query destination). */
export const ALL_HOSTS_GROUP = '224.0.0.1';

/** All Routers group (Leave destination). */
export const ALL_ROUTERS_GROUP = '224.0.0.2';

/**
 * Represents a multicast group with its set of joined ports (switch)
 * or interfaces (router).
 */
export interface MulticastGroup {
  groupAddress: string;
  joinedPorts: Set<string>;
}

/**
 * Returns true when the given IPv4 address is in the Class D range (224.0.0.0/4).
 */
export function isMulticastIp(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const first = parts[0];
  if (first === undefined) return false;
  const firstOctet = parseInt(first, 10);
  return firstOctet >= 224 && firstOctet <= 239;
}

/**
 * Returns true when the given IPv4 multicast address is in the link-local
 * range (224.0.0.0/24). These addresses are always flooded and never pruned
 * by IGMP snooping.
 */
export function isLinkLocalMulticast(ip: string): boolean {
  if (!isMulticastIp(ip)) return false;
  const parts = ip.split('.');
  const first = parts[0];
  const second = parts[1];
  const third = parts[2];
  if (first === undefined || second === undefined || third === undefined) {
    return false;
  }
  return first === '224' && second === '0' && third === '0';
}
