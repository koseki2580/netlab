import type { Ipv6Packet } from '../../types/packets';
import type { HeaderValues } from '../pack/types';

/** An `Ipv6Packet` header as a header object; `payloadLength` is what the payload measures. */
export function ipv6ToValues(ip: Ipv6Packet, payloadLength: number): HeaderValues {
  return {
    version: 6,
    trafficClass: ip.trafficClass ?? 0,
    flowLabel: ip.flowLabel ?? 0,
    payloadLength: ip.payloadLength ?? payloadLength,
    nextHeader: ip.nextHeader,
    hopLimit: ip.hopLimit,
    source: ip.srcIp,
    destination: ip.dstIp,
  };
}
