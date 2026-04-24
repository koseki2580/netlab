import type { NetworkTopology } from '../../types/topology';
import { isIpAddress } from '../../utils/network';
import type { StaticRoute } from '../types';

export type RouteValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'bad-cidr'
        | 'bad-next-hop'
        | 'unreachable'
        | 'bad-interface'
        | 'negative-metric';
    };

export function parseCidr(
  cidr: string,
): { readonly net: string; readonly prefixLen: number } | null {
  const [net, prefix] = cidr.split('/');
  if (!net || !prefix || !isIpAddress(net)) return null;
  const prefixLen = Number(prefix);
  if (!Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > 32) return null;
  return { net, prefixLen };
}

export function isReachableNextHop(
  topology: NetworkTopology,
  nodeId: string,
  ifaceId: string,
  nextHop: string,
): boolean {
  if (nextHop === 'direct') return true;
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  const iface = node?.data.interfaces?.find((candidate) => candidate.id === ifaceId);
  if (!iface) return false;

  const [nextHopA, nextHopB, nextHopC] = nextHop.split('.');
  const [ifaceA, ifaceB, ifaceC] = iface.ipAddress.split('.');
  return nextHopA === ifaceA && nextHopB === ifaceB && nextHopC === ifaceC;
}

export function validateStaticRoute(
  topology: NetworkTopology,
  nodeId: string,
  route: StaticRoute,
): RouteValidationResult {
  if (!parseCidr(route.prefix)) return { ok: false, reason: 'bad-cidr' };
  if (route.nextHop !== 'direct' && !isIpAddress(route.nextHop)) {
    return { ok: false, reason: 'bad-next-hop' };
  }
  if (route.metric < 0 || !Number.isFinite(route.metric)) {
    return { ok: false, reason: 'negative-metric' };
  }

  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  const iface = node?.data.interfaces?.find((candidate) => candidate.id === route.outInterface);
  if (!iface) return { ok: false, reason: 'bad-interface' };
  if (!isReachableNextHop(topology, nodeId, route.outInterface, route.nextHop)) {
    return { ok: false, reason: 'unreachable' };
  }

  return { ok: true };
}
