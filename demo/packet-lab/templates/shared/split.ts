/**
 * What the fragment templates share: a packet over a chain of routers with one
 * narrow cable (never the sender's own), and the split RFC 791 gives, which
 * the harness proves equal to the simulator's own.
 *
 * The amount to carry is drawn by case, so the reasoning changes and not only
 * the digits: the last piece small, the amount an exact multiple of what a
 * piece holds (every piece full), or the last piece nearly full. MTUs include
 * ones where the MTU less 20 is not a multiple of 8, so that "fill to the MTU"
 * is wrong.
 */

import type { Draw } from '../../../exercises/templates/shared/draw';
import type { Place } from '../../../exercises/templates/shared/places';
import type { AddressPlan } from '../../../exercises/templates/shared/plans';
import { IP_HEADER_BYTES, TRANSPORT_HEADER_BYTES } from '../../fields';
import type { Carries, FragmentRow, PacketGiven } from '../../model';
import { chainNet, packetFrom, withMtu, type PacketNet, type RouterCount } from './nets';

export const FRAGMENT_MTUS = [576, 577, 590, 600, 620, 700, 1006, 1000, 1280, 1400] as const;
export type SplitCase = 'small-last' | 'exact' | 'nearly-full';

export interface SplitSetup {
  readonly net: PacketNet;
  readonly packet: PacketGiven & { readonly dstIp: string };
  readonly mtu: number;
  readonly cutBy: string;
  readonly narrowEdgeId: string;
  readonly splitCase: SplitCase;
  readonly count: number;
  readonly routers: RouterCount;
}

export function drawSplit(
  draw: Draw,
  place: Place,
  plan: AddressPlan,
  seed: number,
  pieces: readonly number[],
  carries: Carries,
): SplitSetup {
  const routers = draw.pick([2, 3] as const) as RouterCount;
  const cutAt = draw.int(routers);
  const mtu = draw.pick(FRAGMENT_MTUS);
  const splitCase = draw.pick(['small-last', 'exact', 'nearly-full'] as const);
  const count = pieces[draw.int(pieces.length)] ?? 2;
  const room = Math.floor((mtu - IP_HEADER_BYTES) / 8) * 8;
  const carry =
    splitCase === 'exact'
      ? count * room
      : splitCase === 'small-last'
        ? (count - 1) * room + 12 + draw.int(Math.floor(room / 3))
        : count * room - 1 - draw.int(24);
  const base = chainNet(place, plan, routers, seed);
  const cutBy = base.routers[cutAt] ?? 'r1';
  const narrowEdgeId = base.edgeAfter[cutBy] ?? 'e-srv';
  const net = withMtu(base, narrowEdgeId, mtu);
  const packet = packetFrom(net, 'pc', {
    dstIp: net.ip.srv ?? '',
    carries,
    ...(carries === 'tcp' ? {} : { dstPort: carries === 'udp' ? 5004 : null }),
    dataBytes: carry - TRANSPORT_HEADER_BYTES[carries],
  }) as PacketGiven & { dstIp: string };
  return { net, packet, mtu, cutBy, narrowEdgeId, splitCase, count, routers };
}

/** RFC 791: every piece but the last carries the most whole 8-byte steps that fit. */
export function rfcSplit(
  packet: PacketGiven,
  mtu: number,
  offsetUnit: 'units8' | 'bytes',
  asks: { readonly offsets: boolean; readonly flags: boolean },
): FragmentRow[] {
  const carry = TRANSPORT_HEADER_BYTES[packet.carries] + packet.dataBytes;
  const room = Math.floor((mtu - IP_HEADER_BYTES) / 8) * 8;
  const rows: FragmentRow[] = [];
  for (let done = 0; done < carry; done += room) {
    const take = Math.min(room, carry - done);
    rows.push({
      size: take + IP_HEADER_BYTES,
      ...(asks.offsets ? { offset: offsetUnit === 'bytes' ? done : done / 8 } : {}),
      ...(asks.flags ? { mf: done + take < carry } : {}),
    });
  }
  return rows;
}
