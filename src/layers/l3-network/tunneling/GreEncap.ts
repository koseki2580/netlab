import type { IpPacket } from '../../../types/packets';
import type { GreEnvelope, GreTunnelConfig } from '../../../types/tunneling';

export function encapGre(inner: IpPacket, config: GreTunnelConfig): IpPacket {
  const envelope: GreEnvelope = {
    kind: 'gre',
    header: {
      hasChecksum: false,
      hasKey: config.key !== undefined,
      hasSequence: config.sequence !== undefined,
      version: 0,
      protocolType: inner.version === 6 ? 0x86dd : 0x0800,
      ...(config.key === undefined ? {} : { key: config.key }),
      ...(config.sequence === undefined ? {} : { sequence: config.sequence }),
    },
    inner,
  };
  return {
    layer: 'L3',
    srcIp: config.sourceIp,
    dstIp: config.destinationIp,
    ttl: 64,
    protocol: 47,
    payload: { layer: 'raw', data: JSON.stringify(envelope) },
  };
}

export function decapGre(outer: IpPacket): { inner: IpPacket; key?: number; sequence?: number } {
  if (outer.protocol !== 47 || outer.payload.layer !== 'raw') {
    throw new RangeError('packet is not a GRE envelope');
  }
  const envelope = JSON.parse(outer.payload.data) as GreEnvelope;
  if (envelope.kind !== 'gre') throw new RangeError('raw payload is not GRE');
  return {
    inner: envelope.inner,
    ...(envelope.header.key === undefined ? {} : { key: envelope.header.key }),
    ...(envelope.header.sequence === undefined ? {} : { sequence: envelope.header.sequence }),
  };
}
