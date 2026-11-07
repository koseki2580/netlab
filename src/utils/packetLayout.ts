import type { HeaderValues, ProtocolWire } from '../protocols/pack/types';
import type {
  ArpEthernetFrame,
  DhcpMessage,
  DnsMessage,
  EthernetFrame,
  HttpMessage,
  IcmpMessage,
  Icmpv6Message,
  IpPacket,
  Ipv6Packet,
  RawPayload,
  TcpFlags,
  TcpSegment,
  UdpDatagram,
} from '../types/packets';
import { dnsMessageToValues, dnsWire } from '../protocols/dns/wire';
import { deriveLayout } from '../protocols/pack/wire';
import { parseIpv6 } from './ipv6';

export const DEFAULT_ETHERNET_PREAMBLE = [0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xab];

const encoder = new TextEncoder();

export function parseMac(mac: string): number[] {
  return mac.split(':').map((part) => parseInt(part, 16));
}

export function parseIp(ip: string): number[] {
  return ip.split('.').map(Number);
}

export function parseIpv6Bytes(ip: string): number[] {
  return parseIpv6(ip).hextets.flatMap((hextet) => uint16BE(hextet));
}

export function uint16BE(value: number): [number, number] {
  return [(value >> 8) & 0xff, value & 0xff];
}

export function uint32BE(value: number): [number, number, number, number] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

export function isTcpSegment(payload: IpPacket['payload']): payload is TcpSegment {
  return 'seq' in payload;
}

export function isIcmpMessage(payload: IpPacket['payload']): payload is IcmpMessage {
  return 'type' in payload && 'code' in payload;
}

export function isRawPayload(
  payload: IpPacket['payload'] | HttpMessage | RawPayload | DhcpMessage | DnsMessage,
): payload is RawPayload {
  return payload.layer === 'raw';
}

export function rawStringToBytes(data: string): number[] {
  const bytes: number[] = [];

  for (let index = 0; index < data.length; index += 1) {
    bytes.push(data.charCodeAt(index) & 0xff);
  }

  return bytes;
}

export function bytesToRawString(bytes: readonly number[]): string {
  let result = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    result += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }

  return result;
}

export function formatHttpMessage(message: HttpMessage): string {
  const { method, url, statusCode, headers, body } = message;

  let text =
    method !== undefined
      ? `${method} ${url ?? '/'} HTTP/1.1\r\n`
      : `HTTP/1.1 ${statusCode ?? 200} OK\r\n`;

  for (const [key, value] of Object.entries(headers)) {
    text += `${key}: ${value}\r\n`;
  }

  text += '\r\n';
  if (body) {
    text += body;
  }

  return text;
}

export function formatDhcpMessage(message: DhcpMessage): string {
  const parts = [
    `DHCP ${message.messageType}`,
    `xid=${message.transactionId}`,
    `client=${message.clientMac}`,
  ];

  if (message.offeredIp) parts.push(`offered=${message.offeredIp}`);
  if (message.serverIp) parts.push(`server=${message.serverIp}`);
  if (message.options.subnetMask) parts.push(`mask=${message.options.subnetMask}`);
  if (message.options.router) parts.push(`gw=${message.options.router}`);
  if (message.options.dnsServer) parts.push(`dns=${message.options.dnsServer}`);
  if (message.options.leaseTime != null) parts.push(`lease=${message.options.leaseTime}`);

  return parts.join(' ');
}

/** RFC 1035 §4.1 wire format of a DNS message, from the DNS pack (REQ-140, REQ-302). */
export function buildDnsMessageBytes(message: DnsMessage): number[] {
  return deriveLayout(dnsWire, dnsMessageToValues(message)).bytes;
}

export function buildApplicationPayloadBytes(
  payload: HttpMessage | RawPayload | DhcpMessage | DnsMessage,
): number[] {
  if (isRawPayload(payload)) {
    return rawStringToBytes(payload.data);
  }

  if ('messageType' in payload) {
    return Array.from(encoder.encode(formatDhcpMessage(payload)));
  }

  if ('questions' in payload) {
    return buildDnsMessageBytes(payload);
  }

  return Array.from(encoder.encode(formatHttpMessage(payload)));
}

export function buildTcpFlagsByte(flags: TcpFlags): number {
  return (
    ((flags.urg ? 1 : 0) << 5) |
    ((flags.ack ? 1 : 0) << 4) |
    ((flags.psh ? 1 : 0) << 3) |
    ((flags.rst ? 1 : 0) << 2) |
    ((flags.syn ? 1 : 0) << 1) |
    (flags.fin ? 1 : 0)
  );
}

export function buildTcpSegmentBytes(tcp: TcpSegment): number[] {
  const windowSize = tcp.windowSize ?? 0xffff;
  const checksum = tcp.checksum ?? 0;
  const urgentPointer = tcp.urgentPointer ?? 0;
  const payloadBytes = buildApplicationPayloadBytes(tcp.payload);

  return [
    ...uint16BE(tcp.srcPort),
    ...uint16BE(tcp.dstPort),
    ...uint32BE(tcp.seq),
    ...uint32BE(tcp.ack),
    0x50,
    buildTcpFlagsByte(tcp.flags),
    ...uint16BE(windowSize),
    ...uint16BE(checksum),
    ...uint16BE(urgentPointer),
    ...payloadBytes,
  ];
}

export function buildUdpDatagramBytes(udp: UdpDatagram): number[] {
  const payloadBytes = buildApplicationPayloadBytes(udp.payload);
  const length = udp.length ?? 8 + payloadBytes.length;
  const checksum = udp.checksum ?? 0;

  return [
    ...uint16BE(udp.srcPort),
    ...uint16BE(udp.dstPort),
    ...uint16BE(length),
    ...uint16BE(checksum),
    ...payloadBytes,
  ];
}

export function buildIcmpMessageBytes(icmp: IcmpMessage): number[] {
  const identifier = icmp.identifier ?? 0;
  const sequenceNumber = icmp.sequenceNumber ?? 0;
  const dataBytes = icmp.data ? rawStringToBytes(icmp.data) : [];

  return [
    icmp.type & 0xff,
    icmp.code & 0xff,
    ...uint16BE(icmp.checksum),
    ...uint16BE(identifier),
    ...uint16BE(sequenceNumber),
    ...dataBytes,
  ];
}

export function buildTransportBytes(payload: IpPacket['payload']): number[] {
  if (isRawPayload(payload)) {
    return buildApplicationPayloadBytes(payload);
  }

  if (isTcpSegment(payload)) {
    return buildTcpSegmentBytes(payload);
  }

  if (isIcmpMessage(payload)) {
    return buildIcmpMessageBytes(payload);
  }

  if ('igmpType' in payload) {
    // IgmpMessage: produce a minimal 8-byte IGMP header representation
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }

  return buildUdpDatagramBytes(payload);
}

export function buildIpv4PayloadBytes(ip: IpPacket): number[] {
  const transportBytes = buildTransportBytes(ip.payload);
  const headerLength = (ip.ihl ?? 5) * 4;

  if (ip.totalLength === undefined) {
    return transportBytes;
  }

  return transportBytes.slice(0, Math.max(0, ip.totalLength - headerLength));
}

export function buildIpv4FlagsAndFragmentOffset(ip: IpPacket): number {
  const flags = ip.flags ?? { df: true, mf: false };
  const flagBits = ((flags.df ? 1 : 0) << 1) | (flags.mf ? 1 : 0);
  return ((flagBits & 0x7) << 13) | ((ip.fragmentOffset ?? 0) & 0x1fff);
}

export interface BuildIpv4HeaderOptions {
  checksumOverride?: number;
}

export function buildIpv4HeaderBytes(ip: IpPacket, options: BuildIpv4HeaderOptions = {}): number[] {
  const transportBytes = buildIpv4PayloadBytes(ip);
  const ihl = ip.ihl ?? 5;
  const headerLength = ihl * 4;
  const totalLength = ip.totalLength ?? headerLength + transportBytes.length;
  const dscp = ip.dscp ?? 0;
  const ecn = ip.ecn ?? 0;
  const identification = ip.identification ?? 0;
  const flagsAndOffset = buildIpv4FlagsAndFragmentOffset(ip);
  const headerChecksum = options.checksumOverride ?? ip.headerChecksum ?? 0;

  return [
    ((4 & 0x0f) << 4) | (ihl & 0x0f),
    ((dscp & 0x3f) << 2) | (ecn & 0x03),
    ...uint16BE(totalLength),
    ...uint16BE(identification),
    ...uint16BE(flagsAndOffset),
    ip.ttl & 0xff,
    ip.protocol & 0xff,
    ...uint16BE(headerChecksum),
    ...parseIp(ip.srcIp),
    ...parseIp(ip.dstIp),
  ];
}

export function buildIpv4PacketBytes(ip: IpPacket): number[] {
  return [...buildIpv4HeaderBytes(ip), ...buildIpv4PayloadBytes(ip)];
}

/** The ICMPv6 pack's codec, set when its wire tier loads (`protocolPacks.loadWire('icmpv6')`). */
export interface Icmpv6Codec {
  bytes(ip: Ipv6Packet & { payload: Icmpv6Message }): number[];
  values(ip: Ipv6Packet & { payload: Icmpv6Message }): HeaderValues;
  wireFor(message: Icmpv6Message): ProtocolWire;
}

let icmpv6Codec: Icmpv6Codec | undefined;

/** Called by the ICMPv6 wire tier's loader; the worker loads it before its first send. */
export function registerIcmpv6Codec(codec: Icmpv6Codec): void {
  icmpv6Codec = codec;
}

export function getIcmpv6Codec(): Icmpv6Codec | undefined {
  return icmpv6Codec;
}

/**
 * An IPv6 packet's payload. ICMPv6 and ND go through their packs, checksum computed
 * (REQ-322), once the ICMPv6 wire tier has loaded; before that, as they always were.
 */
export function buildIpv6PayloadBytes(ip: Ipv6Packet): number[] {
  const payload = ip.payload;
  return icmpv6Codec && ip.nextHeader === 58 && 'type' in payload && 'code' in payload
    ? icmpv6Codec.bytes({ ...ip, payload })
    : buildTransportBytes(payload);
}

export function buildIpv6HeaderBytes(ip: Ipv6Packet): number[] {
  const payloadBytes = buildIpv6PayloadBytes(ip);
  const trafficClass = ip.trafficClass ?? 0;
  const flowLabel = ip.flowLabel ?? 0;
  const firstWord = ((6 & 0x0f) << 28) | ((trafficClass & 0xff) << 20) | (flowLabel & 0x000fffff);

  return [
    ...uint32BE(firstWord),
    ...uint16BE(ip.payloadLength ?? payloadBytes.length),
    ip.nextHeader & 0xff,
    ip.hopLimit & 0xff,
    ...parseIpv6Bytes(ip.srcIp),
    ...parseIpv6Bytes(ip.dstIp),
  ];
}

export function buildIpv6PacketBytes(ip: Ipv6Packet): number[] {
  return [...buildIpv6HeaderBytes(ip), ...buildIpv6PayloadBytes(ip)];
}

/** An ARP frame without a preamble, with its FCS. */
export function buildArpFrameBytes(frame: ArpEthernetFrame): number[] {
  return [
    ...parseMac(frame.dstMac),
    ...parseMac(frame.srcMac),
    0x08,
    0x06,
    0x00,
    0x01,
    0x08,
    0x00,
    0x06,
    0x04,
    ...uint16BE(frame.payload.operation === 'request' ? 1 : 2),
    ...parseMac(frame.payload.senderMac),
    ...parseIp(frame.payload.senderIp),
    ...parseMac(frame.payload.targetMac),
    ...parseIp(frame.payload.targetIp),
    ...uint32BE(frame.fcs ?? 0),
  ];
}

export interface BuildEthernetFrameOptions {
  includePreamble?: boolean;
  includeFcs?: boolean;
  fcsOverride?: number;
}

export function buildEthernetFrameBytes(
  frame: EthernetFrame,
  options: BuildEthernetFrameOptions = {},
): number[] {
  const includePreamble = options.includePreamble ?? true;
  const includeFcs = options.includeFcs ?? true;
  const bytes: number[] = [];

  if (includePreamble) {
    bytes.push(...(frame.preamble ?? DEFAULT_ETHERNET_PREAMBLE));
  }

  bytes.push(
    ...parseMac(frame.dstMac),
    ...parseMac(frame.srcMac),
    ...uint16BE(frame.etherType),
    ...('hopLimit' in frame.payload
      ? buildIpv6PacketBytes(frame.payload)
      : buildIpv4PacketBytes(frame.payload)),
  );

  if (includeFcs) {
    bytes.push(...uint32BE(options.fcsOverride ?? frame.fcs ?? 0));
  }

  return bytes;
}
