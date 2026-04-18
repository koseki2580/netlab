import type { IcmpMessage, IpPacket } from '../types/packets';
import { rawStringToBytes } from '../utils/packetLayout';
import { ICMP_CODE, ICMP_TYPE } from './icmp';

export interface FragNeededSignal {
  originalDstIp: string;
  nextHopMtu: number;
}

function isIcmpMessage(payload: IpPacket['payload']): payload is IcmpMessage {
  return 'type' in payload && 'code' in payload;
}

function decodeIpv4Address(bytes: number[]): string | null {
  if (bytes.length < 4 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    return null;
  }

  return bytes.join('.');
}

export function parseIcmpFragNeeded(ipPacket: IpPacket): FragNeededSignal | null {
  if (!isIcmpMessage(ipPacket.payload)) {
    return null;
  }

  if (
    ipPacket.payload.type !== ICMP_TYPE.DESTINATION_UNREACHABLE ||
    ipPacket.payload.code !== ICMP_CODE.FRAGMENTATION_NEEDED
  ) {
    return null;
  }

  const nextHopMtu = ipPacket.payload.sequenceNumber;
  if (!Number.isFinite(nextHopMtu) || nextHopMtu === undefined) {
    return null;
  }

  const data = ipPacket.payload.data;
  if (typeof data !== 'string' || data.length === 0) {
    return null;
  }

  const quotedBytes = rawStringToBytes(data);
  if (quotedBytes.length < 20) {
    return null;
  }

  const originalDstIp = decodeIpv4Address(quotedBytes.slice(16, 20));
  if (!originalDstIp) {
    return null;
  }

  return {
    originalDstIp,
    nextHopMtu,
  };
}
