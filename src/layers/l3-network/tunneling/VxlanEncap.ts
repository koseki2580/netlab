import type { EthernetFrame, IpPacket, UdpDatagram } from '../../../types/packets';
import type { VxlanEncapConfig, VxlanEnvelope, VxlanRawPayload } from '../../../types/tunneling';
import { buildEthernetFrameBytes, bytesToRawString } from '../../../utils/packetLayout';
import { serializeVxlanHeader } from './VxlanHeader';
import { hashFlow } from '../../../utils/hashFlow';

export function encapVxlan(inner: EthernetFrame, config: VxlanEncapConfig): IpPacket {
  const envelope: VxlanEnvelope = { kind: 'vxlan', header: { vni: config.vni }, inner };
  const srcPort =
    49152 +
    (hashFlow({
      srcIp: inner.srcMac,
      dstIp: inner.dstMac,
      protocol: 17,
      srcPort: config.vni,
      dstPort: 4789,
    }) %
      16384);
  return {
    layer: 'L3',
    srcIp: config.sourceVtepIp,
    dstIp: config.destinationVtepIp,
    ttl: 64,
    protocol: 17,
    payload: {
      layer: 'L4',
      srcPort,
      dstPort: 4789,
      payload: vxlanPayload(envelope),
    },
  };
}

/**
 * The UDP payload: the RFC 7348 header and the inner frame (no preamble, no FCS) as
 * real bytes in `data`, the structure in `vxlan` for the far VTEP.
 */
function vxlanPayload(vxlan: VxlanEnvelope): VxlanRawPayload {
  const inner = buildEthernetFrameBytes(vxlan.inner, { includePreamble: false, includeFcs: false });
  return {
    layer: 'raw',
    data: bytesToRawString([...serializeVxlanHeader(vxlan.header), ...inner]),
    vxlan,
  };
}

export function decapVxlan(outer: IpPacket): { vni: number; inner: EthernetFrame } {
  if (outer.protocol !== 17 || !isVxlanUdpPayload(outer.payload)) {
    throw new RangeError('packet is not a VXLAN envelope');
  }
  const envelope = (outer.payload.payload as Partial<VxlanRawPayload>).vxlan;
  if (!envelope) throw new RangeError('raw payload is not VXLAN');
  return { vni: envelope.header.vni, inner: envelope.inner };
}

function isVxlanUdpPayload(
  payload: IpPacket['payload'],
): payload is UdpDatagram & { payload: { layer: 'raw'; data: string } } {
  return (
    payload.layer === 'L4' &&
    'dstPort' in payload &&
    payload.dstPort === 4789 &&
    'payload' in payload &&
    payload.payload.layer === 'raw'
  );
}

export function replicateBum(
  peerVtepIps: readonly string[],
  inner: EthernetFrame,
  config: Omit<VxlanEncapConfig, 'destinationVtepIp'>,
): IpPacket[] {
  return peerVtepIps.map((destinationVtepIp) =>
    encapVxlan(inner, { ...config, destinationVtepIp }),
  );
}
