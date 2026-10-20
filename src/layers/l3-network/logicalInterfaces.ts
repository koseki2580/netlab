import type { RouteEntry } from '../../types/routing';
import type { NetlabNode } from '../../types/topology';
import { isInSubnet, prefixLength } from '../../utils/cidr';
import { isIpv6Address } from '../../utils/ipv6';

/**
 * A router's interfaces as routing sees them: each physical interface, and
 * each VLAN sub-interface as one more interface with its parent's MAC.
 */
export interface LogicalRouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  ipv6Address?: string;
  prefixLength6?: number;
  macAddress: string;
  mtu?: number;
  parentInterfaceId?: string;
  vlanId?: number;
}

/** A router's logical interfaces; none for any other device. */
export function logicalInterfaces(node: NetlabNode | null | undefined): LogicalRouterInterface[] {
  if (node?.data.role !== 'router') return [];
  // A physical interface is its own logical one; a sub-interface borrows its
  // parent's MAC and, unless it sets its own, its MTU.
  return (node.data.interfaces ?? []).flatMap((iface) => [
    iface,
    ...(iface.subInterfaces ?? []).map((sub) => ({
      ...sub,
      name: sub.id,
      macAddress: iface.macAddress,
      parentInterfaceId: iface.id,
      ...((sub.mtu ?? iface.mtu) !== undefined ? { mtu: sub.mtu ?? iface.mtu } : {}),
    })),
  ]);
}

/** Whether `ip` is on the network `iface` is connected to (on-link). */
export function interfaceMatchesTarget(iface: LogicalRouterInterface, ip: string): boolean {
  if (isIpv6Address(ip)) {
    return iface.ipv6Address !== undefined && iface.prefixLength6 !== undefined
      ? isInSubnet(ip, `${iface.ipv6Address}/${iface.prefixLength6}`)
      : false;
  }
  return isInSubnet(ip, `${iface.ipAddress}/${iface.prefixLength}`);
}

/** The longest-prefix match for `dstIp`, or null. */
export function bestRoute(dstIp: string, routes: readonly RouteEntry[]): RouteEntry | null {
  return (
    [...routes]
      .sort((a, b) => prefixLength(b.destination) - prefixLength(a.destination))
      .find((route) => isInSubnet(dstIp, route.destination)) ?? null
  );
}
