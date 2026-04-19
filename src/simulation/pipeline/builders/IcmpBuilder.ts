import type { IcmpMessage, InFlightPacket, IpPacket } from '../../../types/packets';
import { stableHash32 } from '../../../utils/hash';
import {
  buildIpv4HeaderBytes,
  buildTransportBytes,
  bytesToRawString,
} from '../../../utils/packetLayout';
import { ICMP_CODE, ICMP_TYPE } from '../../icmp';

const BROADCAST_IP = '255.255.255.255';

function isIcmpMessage(payload: IpPacket['payload']): payload is IcmpMessage {
  return 'type' in payload && 'code' in payload;
}

export class IcmpBuilder {
  makePacketId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  buildIcmpPacket(
    packetId: string,
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    ttl: number,
    payload: IcmpMessage,
  ): InFlightPacket {
    return {
      id: packetId,
      srcNodeId,
      dstNodeId,
      currentDeviceId: srcNodeId,
      ingressPortId: '',
      path: [],
      timestamp: Date.now(),
      frame: {
        layer: 'L2',
        srcMac: '00:00:00:00:00:00',
        dstMac: '00:00:00:00:00:00',
        etherType: 0x0800,
        payload: {
          layer: 'L3',
          srcIp,
          dstIp,
          ttl,
          protocol: 1,
          payload,
        },
      },
    };
  }

  buildEchoRequest(
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    ttl: number,
  ): InFlightPacket {
    const packetId = this.makePacketId('icmp-echo-request');
    return this.buildIcmpPacket(packetId, srcNodeId, dstNodeId, srcIp, dstIp, ttl, {
      layer: 'L4',
      type: ICMP_TYPE.ECHO_REQUEST,
      code: 0,
      checksum: 0,
      identifier: stableHash32(packetId) & 0xffff,
      sequenceNumber: 1,
    });
  }

  buildEchoReply(
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    requestPacket: InFlightPacket,
  ): InFlightPacket {
    const requestPayload = requestPacket.frame.payload.payload;
    const packetId = `${requestPacket.id}-reply`;
    return this.buildIcmpPacket(packetId, srcNodeId, dstNodeId, srcIp, dstIp, 64, {
      layer: 'L4',
      type: ICMP_TYPE.ECHO_REPLY,
      code: 0,
      checksum: 0,
      ...(isIcmpMessage(requestPayload) && requestPayload.identifier !== undefined
        ? { identifier: requestPayload.identifier }
        : {}),
      ...(isIcmpMessage(requestPayload) && requestPayload.sequenceNumber !== undefined
        ? { sequenceNumber: requestPayload.sequenceNumber }
        : {}),
    });
  }

  buildTimeExceeded(
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
  ): InFlightPacket {
    return this.buildIcmpPacket(
      `${originalPacket.id}-ttl-exceeded`,
      routerNodeId,
      originalPacket.srcNodeId,
      routerIp,
      originalPacket.frame.payload.srcIp,
      64,
      {
        layer: 'L4',
        type: ICMP_TYPE.TIME_EXCEEDED,
        code: ICMP_CODE.TTL_EXCEEDED_IN_TRANSIT,
        checksum: 0,
        data: `Original dst: ${originalPacket.frame.payload.dstIp}`,
      },
    );
  }

  shouldEmitGeneratedIcmp(srcIp: string): boolean {
    return srcIp !== '0.0.0.0' && srcIp !== BROADCAST_IP;
  }

  buildFragmentationNeeded(
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
    nextHopMtu: number,
  ): InFlightPacket {
    const quotedBytes = [
      ...buildIpv4HeaderBytes(originalPacket.frame.payload),
      ...buildTransportBytes(originalPacket.frame.payload.payload).slice(0, 8),
    ];

    return this.buildIcmpPacket(
      `${originalPacket.id}-frag-needed`,
      routerNodeId,
      originalPacket.srcNodeId,
      routerIp,
      originalPacket.frame.payload.srcIp,
      64,
      {
        layer: 'L4',
        type: ICMP_TYPE.DESTINATION_UNREACHABLE,
        code: ICMP_CODE.FRAGMENTATION_NEEDED,
        checksum: 0,
        sequenceNumber: nextHopMtu,
        data: bytesToRawString(quotedBytes),
      },
    );
  }
}
