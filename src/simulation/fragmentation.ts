import type { IpPacket, RawPayload } from '../types/packets';
import { stableHash32 } from '../utils/hash';
import {
  buildTransportBytes,
  bytesToRawString,
  isIcmpMessage,
  isTcpSegment,
} from '../utils/packetLayout';

const IP_HEADER_BYTES = 20;
const ICMP_HEADER_BYTES = 8;
const UDP_HEADER_BYTES = 8;
const TCP_HEADER_BYTES = 20;
const MIN_IPV4_FRAGMENT_MTU = 28;

function ipHeaderBytes(packet: IpPacket): number {
  return (packet.ihl ?? 5) * 4;
}

function payloadByteLength(packet: IpPacket): number {
  return packetSizeBytes(packet) - ipHeaderBytes(packet);
}

function actualPayloadBytes(packet: IpPacket): number[] {
  const bytes = buildTransportBytes(packet.payload);
  if (packet.totalLength === undefined) {
    return bytes;
  }

  return bytes.slice(0, Math.max(0, packet.totalLength - ipHeaderBytes(packet)));
}

function toRawPayload(bytes: number[]): RawPayload {
  return {
    layer: 'raw',
    data: bytesToRawString(bytes),
  };
}

function firstFragmentPayload(packet: IpPacket, bytes: number[]): IpPacket['payload'] {
  const originalPayload = packet.payload;

  if (isIcmpMessage(originalPayload)) {
    if (bytes.length < ICMP_HEADER_BYTES) {
      return toRawPayload(bytes);
    }

    return {
      ...originalPayload,
      data: bytesToRawString(bytes.slice(ICMP_HEADER_BYTES)),
    };
  }

  if (isTcpSegment(originalPayload)) {
    if (bytes.length < TCP_HEADER_BYTES) {
      return toRawPayload(bytes);
    }

    return {
      ...originalPayload,
      payload: toRawPayload(bytes.slice(TCP_HEADER_BYTES)),
    };
  }

  if (!isTcpSegment(originalPayload) && !isIcmpMessage(originalPayload) && 'srcPort' in originalPayload) {
    if (bytes.length < UDP_HEADER_BYTES) {
      return toRawPayload(bytes);
    }

    return {
      ...originalPayload,
      length: originalPayload.length ?? buildTransportBytes(originalPayload).length,
      payload: toRawPayload(bytes.slice(UDP_HEADER_BYTES)),
    };
  }

  return toRawPayload(bytes);
}

function fragmentFlags(packet: IpPacket, moreFragments: boolean): NonNullable<IpPacket['flags']> {
  return {
    df: packet.flags?.df ?? false,
    mf: moreFragments,
  };
}

export function packetSizeBytes(packet: IpPacket): number {
  return packet.totalLength ?? (ipHeaderBytes(packet) + buildTransportBytes(packet.payload).length);
}

export function effectiveMtu(
  linkMtu: number | undefined,
  interfaceMtu: number | undefined,
): number {
  return Math.min(linkMtu ?? Infinity, interfaceMtu ?? Infinity);
}

export function needsFragmentation(packet: IpPacket, mtu: number): boolean {
  return Number.isFinite(mtu) && packetSizeBytes(packet) > mtu;
}

export function fragment(packet: IpPacket, mtu: number, identification: number): IpPacket[] {
  if (!needsFragmentation(packet, mtu)) {
    return [packet];
  }

  if (mtu < MIN_IPV4_FRAGMENT_MTU) {
    throw new Error(`MTU ${mtu} is too small for IPv4 fragmentation`);
  }

  const maxFragmentPayloadBytes = Math.floor((mtu - IP_HEADER_BYTES) / 8) * 8;
  const bytes = actualPayloadBytes(packet);
  const fragments: IpPacket[] = [];

  for (let offset = 0; offset < bytes.length; offset += maxFragmentPayloadBytes) {
    const remaining = bytes.length - offset;
    const chunkSize = remaining > maxFragmentPayloadBytes ? maxFragmentPayloadBytes : remaining;
    const chunk = bytes.slice(offset, offset + chunkSize);
    const moreFragments = offset + chunk.length < bytes.length;

    fragments.push({
      ...packet,
      identification,
      flags: fragmentFlags(packet, moreFragments),
      fragmentOffset: offset / 8,
      totalLength: IP_HEADER_BYTES + chunk.length,
      headerChecksum: undefined,
      payload: offset === 0 ? firstFragmentPayload(packet, chunk) : toRawPayload(chunk),
      reassemblyPayload: offset === 0 && packet.payload.layer !== 'raw' ? packet.payload : packet.reassemblyPayload,
    });
  }

  return fragments;
}

export function deriveIdentification(
  srcIp: string,
  dstIp: string,
  sessionId: string | undefined,
  sequenceNumber: number | undefined,
): number {
  return stableHash32([srcIp, dstIp, sessionId ?? '', String(sequenceNumber ?? '')].join('|')) & 0xffff;
}

export interface ReassemblyBufferEntry {
  key: string;
  firstFragment: IpPacket;
  fragments: Map<number, IpPacket>;
  totalBytesExpected: number | null;
}

export function tryReassemble(entry: ReassemblyBufferEntry): IpPacket | null {
  if (entry.totalBytesExpected == null) {
    return null;
  }

  const orderedFragments = Array.from(entry.fragments.entries())
    .sort(([left], [right]) => left - right)
    .map(([, fragmentPacket]) => fragmentPacket);

  let expectedOffsetBytes = 0;

  for (const fragmentPacket of orderedFragments) {
    const fragmentOffsetBytes = (fragmentPacket.fragmentOffset ?? 0) * 8;
    if (fragmentOffsetBytes !== expectedOffsetBytes) {
      return null;
    }

    expectedOffsetBytes += payloadByteLength(fragmentPacket);
  }

  if (expectedOffsetBytes !== entry.totalBytesExpected) {
    return null;
  }

  const restoredPayload = entry.firstFragment.reassemblyPayload ?? entry.firstFragment.payload;
  const restoredPacket: IpPacket = {
    ...entry.firstFragment,
    payload: restoredPayload,
    reassemblyPayload: undefined,
    flags: {
      df: entry.firstFragment.flags?.df ?? false,
      mf: false,
    },
    fragmentOffset: 0,
    totalLength: IP_HEADER_BYTES + entry.totalBytesExpected,
    headerChecksum: undefined,
  };

  if (buildTransportBytes(restoredPacket.payload).length !== entry.totalBytesExpected) {
    return null;
  }

  return restoredPacket;
}
