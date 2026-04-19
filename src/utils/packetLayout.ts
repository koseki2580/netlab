import type {
  DhcpMessage,
  DnsMessage,
  EthernetFrame,
  HttpMessage,
  IcmpMessage,
  IpPacket,
  RawPayload,
  TcpFlags,
  TcpSegment,
  UdpDatagram,
} from '../types/packets';

export const DEFAULT_ETHERNET_PREAMBLE = [0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xab];

const encoder = new TextEncoder();

export function parseMac(mac: string): number[] {
  return mac.split(':').map((part) => parseInt(part, 16));
}

export function parseIp(ip: string): number[] {
  return ip.split('.').map(Number);
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

export function formatDnsMessage(message: DnsMessage): string {
  const question = message.questions[0];
  const answer = message.answers[0];

  if (!message.isResponse) {
    return `DNS QUERY ${question?.type ?? 'A'} ${question?.name ?? 'unknown'}`;
  }

  return `DNS RESPONSE ${answer?.name ?? question?.name ?? 'unknown'} ${answer?.address ?? 'NXDOMAIN'} ttl=${answer?.ttl ?? 0}`;
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
    return Array.from(encoder.encode(formatDnsMessage(payload)));
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
    ...buildIpv4PacketBytes(frame.payload),
  );

  if (includeFcs) {
    bytes.push(...uint32BE(options.fcsOverride ?? frame.fcs ?? 0));
  }

  return bytes;
}
