import type { IcmpMessage, InFlightPacket, IpPacket } from '../../../types/packets';
import { stableHash32 } from '../../../utils/hash';
import {
  buildIpv4HeaderBytes,
  buildTransportBytes,
  bytesToRawString,
} from '../../../utils/packetLayout';
import { ICMP_CODE, ICMP_TYPE } from '../../icmp';
import { buildIcmpv6EchoReply, buildIcmpv6EchoRequest, ICMPV6_TYPE } from '../../icmpv6';

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

  buildIpv6EchoRequest(
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    hopLimit: number,
  ): InFlightPacket {
    const packetId = this.makePacketId('icmpv6-echo-request');
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
        etherType: 0x86dd,
        payload: {
          layer: 'L3',
          version: 6,
          srcIp,
          dstIp,
          ttl: hopLimit,
          hopLimit,
          protocol: 58,
          nextHeader: 58,
          payload: buildIcmpv6EchoRequest({
            identifier: stableHash32(packetId) & 0xffff,
            sequenceNumber: 1,
          }),
        },
      },
    };
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

  buildIpv6EchoReply(
    srcNodeId: string,
    dstNodeId: string,
    srcIp: string,
    dstIp: string,
    requestPacket: InFlightPacket,
  ): InFlightPacket {
    const requestPayload = requestPacket.frame.payload.payload;
    const packetId = `${requestPacket.id}-reply`;
    const echoReply =
      'type' in requestPayload && requestPayload.type === ICMPV6_TYPE.ECHO_REQUEST
        ? {
            layer: 'L4' as const,
            type: ICMPV6_TYPE.ECHO_REPLY,
            code: 0,
            checksum: 0,
            ...(requestPayload.identifier !== undefined
              ? { identifier: requestPayload.identifier }
              : {}),
            ...(requestPayload.sequenceNumber !== undefined
              ? { sequenceNumber: requestPayload.sequenceNumber }
              : {}),
          }
        : buildIcmpv6EchoReply({
            layer: 'L4',
            type: ICMPV6_TYPE.ECHO_REQUEST,
            code: 0,
            checksum: 0,
          });

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
        etherType: 0x86dd,
        payload: {
          layer: 'L3',
          version: 6,
          srcIp,
          dstIp,
          ttl: 64,
          hopLimit: 64,
          protocol: 58,
          nextHeader: 58,
          payload: echoReply,
        },
      },
    };
  }

  /** An ICMP error from a router back to the packet's source (RFC 792). */
  private buildError(
    suffix: string,
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
    message: Omit<IcmpMessage, 'layer' | 'checksum'>,
  ): InFlightPacket {
    return this.buildIcmpPacket(
      `${originalPacket.id}-${suffix}`,
      routerNodeId,
      originalPacket.srcNodeId,
      routerIp,
      originalPacket.frame.payload.srcIp,
      64,
      { layer: 'L4', checksum: 0, ...message },
    );
  }

  /** The dropped packet's IP header and first 8 bytes of data, as an error quotes them. */
  private quoted(originalPacket: InFlightPacket): string {
    return bytesToRawString([
      ...buildIpv4HeaderBytes(originalPacket.frame.payload),
      ...buildTransportBytes(originalPacket.frame.payload.payload).slice(0, 8),
    ]);
  }

  buildTimeExceeded(
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
  ): InFlightPacket {
    return this.buildError('ttl-exceeded', routerNodeId, routerIp, originalPacket, {
      type: ICMP_TYPE.TIME_EXCEEDED,
      code: ICMP_CODE.TTL_EXCEEDED_IN_TRANSIT,
      data: `Original dst: ${originalPacket.frame.payload.dstIp}`,
    });
  }

  shouldEmitGeneratedIcmp(srcIp: string): boolean {
    return srcIp !== '0.0.0.0' && srcIp !== BROADCAST_IP;
  }

  /** A router with no route for the destination tells the source (RFC 1812 §5.2.7.1). */
  buildNetUnreachable(
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
  ): InFlightPacket {
    return this.buildError('net-unreachable', routerNodeId, routerIp, originalPacket, {
      type: ICMP_TYPE.DESTINATION_UNREACHABLE,
      code: ICMP_CODE.NET_UNREACHABLE,
      data: this.quoted(originalPacket),
    });
  }

  buildFragmentationNeeded(
    routerNodeId: string,
    routerIp: string,
    originalPacket: InFlightPacket,
    nextHopMtu: number,
  ): InFlightPacket {
    return this.buildError('frag-needed', routerNodeId, routerIp, originalPacket, {
      type: ICMP_TYPE.DESTINATION_UNREACHABLE,
      code: ICMP_CODE.FRAGMENTATION_NEEDED,
      sequenceNumber: nextHopMtu,
      data: this.quoted(originalPacket),
    });
  }
}
