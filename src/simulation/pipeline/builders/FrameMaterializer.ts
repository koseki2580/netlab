import type {
  ArpEthernetFrame,
  IcmpMessage,
  InFlightPacket,
  IpPacket,
  TcpSegment,
  UdpDatagram,
} from '../../../types/packets';
import type { PacketHop } from '../../../types/simulation';
import { computeFcs, computeIpv4Checksum } from '../../../utils/checksum';
import {
  buildEthernetFrameBytes,
  buildIpv4HeaderBytes,
  isTcpSegment,
} from '../../../utils/packetLayout';
import { deriveIdentification } from '../../fragmentation';

function isIcmpMessage(payload: IpPacket['payload']): payload is IcmpMessage {
  return 'type' in payload && 'code' in payload;
}

function isPortBearingPayload(payload: IpPacket['payload']): payload is TcpSegment | UdpDatagram {
  return 'srcPort' in payload && 'dstPort' in payload;
}

export class FrameMaterializer {
  makePacketId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  derivePacketIdentification(packet: InFlightPacket): number {
    const payload = packet.frame.payload.payload;
    const sequenceNumber = isIcmpMessage(payload)
      ? payload.sequenceNumber
      : isTcpSegment(payload)
        ? (payload as TcpSegment).seq
        : undefined;

    return deriveIdentification(
      packet.frame.payload.srcIp,
      packet.frame.payload.dstIp,
      packet.sessionId,
      sequenceNumber,
    );
  }

  withPacketMacs(hop: Omit<PacketHop, 'step'>, packet: InFlightPacket): Omit<PacketHop, 'step'> {
    return {
      ...hop,
      srcMac: packet.frame.srcMac,
      dstMac: packet.frame.dstMac,
    };
  }

  withArpFrameMacs(
    hop: Omit<PacketHop, 'step'>,
    arpFrame: ArpEthernetFrame,
  ): Omit<PacketHop, 'step'> {
    return {
      ...hop,
      srcMac: arpFrame.srcMac,
      dstMac: arpFrame.dstMac,
    };
  }

  withIpv4HeaderChecksum(packet: InFlightPacket): InFlightPacket {
    const ipPacket = packet.frame.payload;
    const checksum = computeIpv4Checksum(buildIpv4HeaderBytes(ipPacket, { checksumOverride: 0 }));

    if (ipPacket.headerChecksum === checksum) {
      return packet;
    }

    return {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...ipPacket,
          headerChecksum: checksum,
        },
      },
    };
  }

  withFrameFcs(packet: InFlightPacket): InFlightPacket {
    const fcs = computeFcs(
      buildEthernetFrameBytes(
        { ...packet.frame, fcs: 0 },
        { includePreamble: false, includeFcs: false },
      ),
    );

    if (packet.frame.fcs === fcs) {
      return packet;
    }

    return {
      ...packet,
      frame: {
        ...packet.frame,
        fcs,
      },
    };
  }

  diffPacketFields(before: InFlightPacket, after: InFlightPacket): string[] {
    const changedFields: string[] = [];
    const beforeTransport = before.frame.payload.payload;
    const afterTransport = after.frame.payload.payload;

    if (before.frame.payload.ttl !== after.frame.payload.ttl) {
      changedFields.push('TTL');
    }
    if (before.frame.payload.headerChecksum !== after.frame.payload.headerChecksum) {
      changedFields.push('Header Checksum');
    }
    if (before.frame.payload.srcIp !== after.frame.payload.srcIp) {
      changedFields.push('Src IP');
    }
    if (before.frame.payload.dstIp !== after.frame.payload.dstIp) {
      changedFields.push('Dst IP');
    }
    if (isPortBearingPayload(beforeTransport) && isPortBearingPayload(afterTransport)) {
      if (beforeTransport.srcPort !== afterTransport.srcPort) {
        changedFields.push('Src Port');
      }
      if (beforeTransport.dstPort !== afterTransport.dstPort) {
        changedFields.push('Dst Port');
      }
    }
    if (before.frame.srcMac !== after.frame.srcMac) {
      changedFields.push('Src MAC');
    }
    if (before.frame.dstMac !== after.frame.dstMac) {
      changedFields.push('Dst MAC');
    }
    if (before.frame.fcs !== after.frame.fcs) {
      changedFields.push('FCS');
    }

    return changedFields;
  }

  withPacketIps(packet: InFlightPacket, ips: { srcIp?: string; dstIp?: string }): InFlightPacket {
    const srcIp = ips.srcIp ?? packet.frame.payload.srcIp;
    const dstIp = ips.dstIp ?? packet.frame.payload.dstIp;
    if (srcIp === packet.frame.payload.srcIp && dstIp === packet.frame.payload.dstIp) {
      return packet;
    }

    return {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...packet.frame.payload,
          srcIp,
          dstIp,
        },
      },
    };
  }
}
