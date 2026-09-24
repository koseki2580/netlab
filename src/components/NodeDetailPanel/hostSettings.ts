import { maskInt } from '../../learning/subnetting';
import type { DhcpLeaseState } from '../../types/services';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import { intToIp, ipToInt, isInSubnet, parseCidr } from '../../utils/cidr';

/** What a host's IP settings screen would show; absent fields are unknown. */
export interface HostSettings {
  ip?: string;
  /** Dotted mask, e.g. 255.255.255.0. */
  mask?: string;
  /** The same mask as a prefix length, when it is a contiguous one. */
  prefix?: number;
  gateway?: string;
  dns?: string;
}

export function prefixToMask(prefix: number): string {
  return intToIp(maskInt(prefix));
}

/** `/n` for a contiguous dotted mask, or undefined when the mask is not one. */
export function maskToPrefix(mask: string): number | undefined {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(mask)) return undefined;
  const bits = ipToInt(mask).toString(2).padStart(32, '0');
  return /^1*0*$/.test(bits) ? bits.lastIndexOf('1') + 1 : undefined;
}

/**
 * The router interface a host's traffic leaves its LAN through: the first
 * router reachable directly or across switches with an interface on the
 * host's subnet — the same router the simulation hands off-LAN packets to.
 */
function lanGateway(
  hostId: string,
  ip: string,
  topology: NetworkTopology,
): { address: string; prefix: number } | undefined {
  const byId = new Map(topology.nodes.map((node) => [node.id, node]));
  const visited = new Set([hostId]);
  const queue = [hostId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const edge of topology.edges) {
      const other =
        edge.source === current ? edge.target : edge.target === current ? edge.source : null;
      if (!other || visited.has(other)) continue;
      visited.add(other);
      const node = byId.get(other);
      if (node?.data.role === 'router') {
        for (const iface of node.data.interfaces ?? []) {
          for (const address of [iface, ...(iface.subInterfaces ?? [])]) {
            if (!address.ipAddress || address.prefixLength === undefined) continue;
            if (isInSubnet(ip, `${address.ipAddress}/${address.prefixLength}`)) {
              return { address: address.ipAddress, prefix: address.prefixLength };
            }
          }
        }
      } else if (node?.data.role === 'switch') {
        queue.push(other);
      }
    }
  }
  return undefined;
}

/** The prefix of the area the host is placed in, when its subnet holds the host. */
function areaPrefix(node: NetlabNode, ip: string, topology: NetworkTopology): number | undefined {
  const area = topology.areas.find(
    (candidate) => candidate.id === node.data.areaId || candidate.devices.includes(node.id),
  );
  if (!area?.subnet || !isInSubnet(ip, area.subnet)) return undefined;
  return parseCidr(area.subnet).length;
}

/**
 * A host's settings, from what exists: a bound DHCP lease first (what it was
 * handed), otherwise its stored address with the mask and gateway of the
 * router on its LAN, or failing that the mask of the area it sits in.
 */
export function resolveHostSettings(
  node: NetlabNode,
  topology: NetworkTopology,
  lease: DhcpLeaseState | null,
  runtimeIp: string | undefined,
): HostSettings {
  if (lease?.status === 'bound' && lease.assignedIp) {
    const prefix = lease.subnetMask ? maskToPrefix(lease.subnetMask) : undefined;
    return {
      ip: lease.assignedIp,
      ...(lease.subnetMask ? { mask: lease.subnetMask } : {}),
      ...(prefix !== undefined ? { prefix } : {}),
      ...(lease.defaultGateway ? { gateway: lease.defaultGateway } : {}),
      ...(lease.dnsServerIp ? { dns: lease.dnsServerIp } : {}),
    };
  }
  const ip = runtimeIp ?? node.data.ip;
  if (!ip) return {};
  const router = lanGateway(node.id, ip, topology);
  const prefix = router?.prefix ?? areaPrefix(node, ip, topology);
  return {
    ip,
    ...(prefix !== undefined ? { mask: prefixToMask(prefix), prefix } : {}),
    ...(router ? { gateway: router.address } : {}),
  };
}
