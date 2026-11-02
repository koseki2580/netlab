import type { IpPacket } from '../../../types/packets';
import type {
  GreEnvelope,
  GreHeader,
  GreRawPayload,
  GreTunnelConfig,
} from '../../../types/tunneling';
import { buildIpv4PacketBytes, bytesToRawString } from '../../../utils/packetLayout';
import { serializeGreHeader } from './GreHeader';

/**
 * Wraps `inner` in outer IPv4 protocol 47. `data` is the real wire bytes (the hex
 * view and pcap read them); `gre` keeps the structured header and inner packet, so
 * the far end gets the inner packet back as it was.
 */
export function encapGre(inner: IpPacket, config: GreTunnelConfig): IpPacket {
  const header: GreHeader = {
    hasChecksum: false,
    hasKey: config.key !== undefined,
    hasSequence: config.sequence !== undefined,
    version: 0,
    protocolType: inner.version === 6 ? 0x86dd : 0x0800,
    ...(config.key === undefined ? {} : { key: config.key }),
    ...(config.sequence === undefined ? {} : { sequence: config.sequence }),
  };
  const gre: GreEnvelope = { kind: 'gre', header, inner };
  const payload: GreRawPayload = {
    layer: 'raw',
    data: bytesToRawString([...serializeGreHeader(header), ...buildIpv4PacketBytes(inner)]),
    gre,
  };
  return {
    layer: 'L3',
    srcIp: config.sourceIp,
    dstIp: config.destinationIp,
    ttl: 64,
    protocol: 47,
    payload,
  };
}

export function decapGre(outer: IpPacket): { inner: IpPacket; key?: number; sequence?: number } {
  const envelope = (outer.payload as Partial<GreRawPayload>).gre;
  if (outer.protocol !== 47 || !envelope) throw new RangeError('packet is not a GRE envelope');
  return {
    inner: envelope.inner,
    ...(envelope.header.key === undefined ? {} : { key: envelope.header.key }),
    ...(envelope.header.sequence === undefined ? {} : { sequence: envelope.header.sequence }),
  };
}
