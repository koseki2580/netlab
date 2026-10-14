/**
 * The network of the level-4 exercises: a chain of routers with a list (ACL)
 * on one of them and a narrow cable after another, so that every way a packet
 * can die is on the diagram in every instance, faulty or not.
 */

import type { Draw } from '../../../exercises/templates/shared/draw';
import type { Place } from '../../../exercises/templates/shared/places';
import type { AddressPlan } from '../../../exercises/templates/shared/plans';
import { chainNet, withFilter, withMtu, type PacketNet, type RouterCount } from './nets';

export const SERVICE_PORTS = [53, 123, 161, 514, 5004, 5060, 1812, 4789] as const;

export interface GuardedPath {
  readonly net: PacketNet;
  readonly count: RouterCount;
  /** Index of the router with the list, and of the router before the narrow cable. */
  readonly aclAt: number;
  readonly narrowAt: number;
  readonly port: number;
  readonly mtu: number;
}

/** `aclAt` and `narrowAt` are router indices from 0; they may be the same router. */
export function guardedPath(
  draw: Draw,
  place: Place,
  plan: AddressPlan,
  seed: number,
  count: RouterCount,
  aclAt: number,
  narrowAt: number,
): GuardedPath {
  const port = draw.pick(SERVICE_PORTS);
  const mtu = draw.pick([576, 600, 800, 1000, 1280] as const);
  const base = chainNet(place, plan, count, seed);
  const acl = base.routers[aclAt] ?? 'r1';
  const narrow = base.routers[narrowAt] ?? 'r1';
  const net = withFilter(withMtu(base, base.edgeAfter[narrow] ?? 'e-srv', mtu), acl, [
    { id: 'service', priority: 10, action: 'permit', protocol: 'udp', dstPort: port },
  ]);
  return { net, count, aclAt, narrowAt, port, mtu };
}
