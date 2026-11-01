/**
 * Where an IPv6 Neighbor Solicitation (RFC 4861) is sent: the target's
 * solicited-node multicast address (RFC 4291 §2.7.1), carried in an Ethernet
 * frame to that group's multicast MAC (RFC 2464 §7).
 */
import { canonicalizeIpv6, parseIpv6 } from '../../src/utils/ipv6';

/** ff02::1:ff00:0/104 plus the address's last 24 bits. */
export function solicitedNodeAddress(address: string): string {
  const [, , , , , , seventh = 0, last = 0] = parseIpv6(address).hextets;
  return canonicalizeIpv6(
    `ff02::1:${(0xff00 | (seventh & 0xff)).toString(16)}:${last.toString(16)}`,
  );
}

/** 33:33 plus the last 32 bits of the solicited-node address. */
export function solicitedNodeMac(address: string): string {
  const [, , , , , , seventh = 0, last = 0] = parseIpv6(solicitedNodeAddress(address)).hextets;
  const bytes = [0x33, 0x33, seventh >> 8, seventh & 0xff, last >> 8, last & 0xff];
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}
