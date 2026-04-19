import { NetlabError } from '../errors';
import { isMulticastIp } from '../types/multicast';
import { getRequired } from './typedAccess';

/**
 * Maps an IPv4 multicast address to its canonical Ethernet multicast MAC.
 * 01:00:5E + low-order 23 bits of the IP (RFC 1112 §6.4).
 */
export function ipToMulticastMac(ip: string): string {
  if (!isMulticastIp(ip)) {
    throw new NetlabError({
      code: 'invariant/not-multicast',
      message: `Not a multicast IP: ${ip}`,
      context: { ip },
    });
  }
  const octets = ip.split('.').map(Number);
  const low23 =
    ((getRequired(octets, 1, { ip }) & 0x7f) << 16) |
    (getRequired(octets, 2, { ip }) << 8) |
    getRequired(octets, 3, { ip });
  const b1 = (low23 >> 16) & 0xff;
  const b2 = (low23 >> 8) & 0xff;
  const b3 = low23 & 0xff;
  return `01:00:5e:${hex(b1)}:${hex(b2)}:${hex(b3)}`;
}

function hex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * True when the MAC is in the IANA multicast range
 * 01:00:5E:00:00:00 – 01:00:5E:7F:FF:FF.
 */
export function isMulticastMac(mac: string): boolean {
  const lower = mac.toLowerCase();
  if (!lower.startsWith('01:00:5e:')) return false;
  const parts = lower.split(':');
  if (parts.length !== 6) return false;
  const byte3 = parseInt(getRequired(parts, 3, { mac }), 16);
  return byte3 <= 0x7f;
}
