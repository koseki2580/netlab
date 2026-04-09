/**
 * packetSerializer.ts
 *
 * Converts a netlab EthernetFrame (nested object model) into a flat byte array
 * with per-byte layer annotations and a list of named protocol fields.
 *
 * All byte layouts are derived directly from the authoritative RFCs:
 *   - L2 Ethernet:  RFC 894  https://www.rfc-editor.org/rfc/rfc894
 *   - L3 IPv4:      RFC 791  https://www.rfc-editor.org/rfc/rfc791
 *   - L4 TCP:       RFC 9293 https://www.rfc-editor.org/rfc/rfc9293 (supersedes RFC 793)
 *   - L4 UDP:       RFC 768  https://www.rfc-editor.org/rfc/rfc768
 *   - L7 HTTP/1.1:  RFC 9110 https://www.rfc-editor.org/rfc/rfc9110
 *                   RFC 9112 https://www.rfc-editor.org/rfc/rfc9112
 */

import type {
  ArpEthernetFrame,
  DhcpMessage,
  DnsMessage,
  EthernetFrame,
  HttpMessage,
  IpPacket,
  RawPayload,
  TcpSegment,
  UdpDatagram,
} from '../types/packets';
import {
  DEFAULT_ETHERNET_PREAMBLE,
  buildApplicationPayloadBytes,
  buildEthernetFrameBytes,
  formatDhcpMessage,
  formatDnsMessage,
  buildIpv4FlagsAndFragmentOffset,
  buildIpv4HeaderBytes,
  buildTcpFlagsByte,
  formatHttpMessage,
  isTcpSegment,
  uint16BE,
  uint32BE,
} from './packetLayout';

export type LayerTag = 'L2' | 'L3' | 'L4' | 'L7' | 'ARP' | 'raw';

export interface AnnotatedField {
  name: string;
  layer: LayerTag;
  byteOffset: number;
  byteLength: number;
  displayValue: string;
}

export interface SerializedPacket {
  bytes: Uint8Array;
  annotations: LayerTag[];
  fields: AnnotatedField[];
}

interface LayerResult {
  bytes: number[];
  fields: AnnotatedField[];
}

function formatHex(value: number, width: number): string {
  return `0x${value.toString(16).padStart(width, '0').toUpperCase()}`;
}

function formatByteSequenceHex(bytes: number[]): string {
  return `0x${bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join('')}`;
}

function formatProtocol(protocol: number): string {
  if (protocol === 6) return 'TCP';
  if (protocol === 17) return 'UDP';
  return String(protocol);
}

function macToBytes(mac: string): number[] {
  return mac.split(':').map((part) => Number.parseInt(part, 16));
}

function ipToBytes(ip: string): number[] {
  return ip.split('.').map((part) => Number.parseInt(part, 10));
}

function formatIpv4FlagsAndOffset(ip: IpPacket): string {
  const flags = ip.flags ?? { df: true, mf: false };
  const fragmentOffset = ip.fragmentOffset ?? 0;
  const fragments = [
    `DF=${flags.df ? 1 : 0}`,
    `MF=${flags.mf ? 1 : 0}`,
    `offset=${fragmentOffset}`,
  ];
  return `${formatHex(buildIpv4FlagsAndFragmentOffset(ip), 4)} (${fragments.join(', ')})`;
}

function serializeL7(
  payload: HttpMessage | RawPayload | DhcpMessage | DnsMessage,
  baseOffset: number,
): LayerResult {
  const bytes = buildApplicationPayloadBytes(payload);
  const label = payload.layer === 'raw'
    ? 'Data'
    : 'messageType' in payload
      ? 'DHCP Payload'
      : 'questions' in payload
        ? 'DNS Payload'
        : 'HTTP Payload';
  const displayValue = payload.layer === 'raw'
    ? payload.data
    : 'messageType' in payload
      ? formatDhcpMessage(payload)
      : 'questions' in payload
        ? formatDnsMessage(payload)
        : formatHttpMessage(payload);

  return {
    bytes,
    fields: [
      {
        name: label,
        layer: payload.layer === 'raw' ? 'raw' : 'L7',
        byteOffset: baseOffset,
        byteLength: bytes.length,
        displayValue: displayValue.slice(0, 80) + (displayValue.length > 80 ? '…' : ''),
      },
    ],
  };
}

function serializeTcp(tcp: TcpSegment, baseOffset: number): LayerResult {
  const payloadResult = serializeL7(tcp.payload, baseOffset + 20);
  const flagsByte = buildTcpFlagsByte(tcp.flags);
  const activeFlags = Object.entries(tcp.flags)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name.toUpperCase())
    .join('+');
  const windowSize = tcp.windowSize ?? 0xffff;
  const checksum = tcp.checksum ?? 0;
  const urgentPointer = tcp.urgentPointer ?? 0;

  const headerBytes = [
    ...uint16BE(tcp.srcPort),
    ...uint16BE(tcp.dstPort),
    ...uint32BE(tcp.seq),
    ...uint32BE(tcp.ack),
    0x50,
    flagsByte,
    ...uint16BE(windowSize),
    ...uint16BE(checksum),
    ...uint16BE(urgentPointer),
  ];

  return {
    bytes: [...headerBytes, ...payloadResult.bytes],
    fields: [
      { name: 'Src Port', layer: 'L4', byteOffset: baseOffset + 0, byteLength: 2, displayValue: String(tcp.srcPort) },
      { name: 'Dst Port', layer: 'L4', byteOffset: baseOffset + 2, byteLength: 2, displayValue: String(tcp.dstPort) },
      { name: 'Seq Number', layer: 'L4', byteOffset: baseOffset + 4, byteLength: 4, displayValue: String(tcp.seq) },
      { name: 'Ack Number', layer: 'L4', byteOffset: baseOffset + 8, byteLength: 4, displayValue: String(tcp.ack) },
      { name: 'Data Offset', layer: 'L4', byteOffset: baseOffset + 12, byteLength: 1, displayValue: '0x50 (20 bytes)' },
      {
        name: 'Flags',
        layer: 'L4',
        byteOffset: baseOffset + 13,
        byteLength: 1,
        displayValue: `${formatHex(flagsByte, 2)} (${activeFlags || 'none'})`,
      },
      { name: 'Window Size', layer: 'L4', byteOffset: baseOffset + 14, byteLength: 2, displayValue: String(windowSize) },
      {
        name: 'Checksum',
        layer: 'L4',
        byteOffset: baseOffset + 16,
        byteLength: 2,
        displayValue: `${formatHex(checksum, 4)} (simulated)`,
      },
      { name: 'Urgent Pointer', layer: 'L4', byteOffset: baseOffset + 18, byteLength: 2, displayValue: String(urgentPointer) },
      ...payloadResult.fields,
    ],
  };
}

function serializeUdp(udp: UdpDatagram, baseOffset: number): LayerResult {
  const payloadResult = serializeL7(udp.payload, baseOffset + 8);
  const length = udp.length ?? (8 + payloadResult.bytes.length);
  const checksum = udp.checksum ?? 0;

  return {
    bytes: [
      ...uint16BE(udp.srcPort),
      ...uint16BE(udp.dstPort),
      ...uint16BE(length),
      ...uint16BE(checksum),
      ...payloadResult.bytes,
    ],
    fields: [
      { name: 'Src Port', layer: 'L4', byteOffset: baseOffset + 0, byteLength: 2, displayValue: String(udp.srcPort) },
      { name: 'Dst Port', layer: 'L4', byteOffset: baseOffset + 2, byteLength: 2, displayValue: String(udp.dstPort) },
      { name: 'Length', layer: 'L4', byteOffset: baseOffset + 4, byteLength: 2, displayValue: String(length) },
      {
        name: 'Checksum',
        layer: 'L4',
        byteOffset: baseOffset + 6,
        byteLength: 2,
        displayValue: `${formatHex(checksum, 4)} (simulated)`,
      },
      ...payloadResult.fields,
    ],
  };
}

function serializeL3(ip: IpPacket, baseOffset: number): LayerResult {
  const headerBytes = buildIpv4HeaderBytes(ip);
  const headerLength = headerBytes.length;
  const l4Base = baseOffset + headerLength;
  const l4Result = isTcpSegment(ip.payload)
    ? serializeTcp(ip.payload, l4Base)
    : serializeUdp(ip.payload, l4Base);
  const totalLength = ip.totalLength ?? (headerLength + l4Result.bytes.length);
  const identification = ip.identification ?? 0;

  return {
    bytes: [...headerBytes, ...l4Result.bytes],
    fields: [
      {
        name: 'Version + IHL',
        layer: 'L3',
        byteOffset: baseOffset + 0,
        byteLength: 1,
        displayValue: `${formatHex(headerBytes[0], 2)} (IPv4, ${(ip.ihl ?? 5) * 4}-byte header)`,
      },
      {
        name: 'DSCP / ECN',
        layer: 'L3',
        byteOffset: baseOffset + 1,
        byteLength: 1,
        displayValue: formatHex(headerBytes[1], 2),
      },
      { name: 'Total Length', layer: 'L3', byteOffset: baseOffset + 2, byteLength: 2, displayValue: String(totalLength) },
      {
        name: 'Identification',
        layer: 'L3',
        byteOffset: baseOffset + 4,
        byteLength: 2,
        displayValue: formatHex(identification, 4),
      },
      {
        name: 'Flags + Frag Offset',
        layer: 'L3',
        byteOffset: baseOffset + 6,
        byteLength: 2,
        displayValue: formatIpv4FlagsAndOffset(ip),
      },
      { name: 'TTL', layer: 'L3', byteOffset: baseOffset + 8, byteLength: 1, displayValue: String(ip.ttl) },
      {
        name: 'Protocol',
        layer: 'L3',
        byteOffset: baseOffset + 9,
        byteLength: 1,
        displayValue: `${ip.protocol} (${formatProtocol(ip.protocol)})`,
      },
      {
        name: 'Header Checksum',
        layer: 'L3',
        byteOffset: baseOffset + 10,
        byteLength: 2,
        displayValue: formatHex(ip.headerChecksum ?? 0, 4),
      },
      { name: 'Src IP', layer: 'L3', byteOffset: baseOffset + 12, byteLength: 4, displayValue: ip.srcIp },
      { name: 'Dst IP', layer: 'L3', byteOffset: baseOffset + 16, byteLength: 4, displayValue: ip.dstIp },
      ...l4Result.fields,
    ],
  };
}

function serializeL2(frame: EthernetFrame): LayerResult {
  const preambleBytes = frame.preamble ?? DEFAULT_ETHERNET_PREAMBLE;
  const l3Base = preambleBytes.length + 14;
  const l3Result = serializeL3(frame.payload, l3Base);
  const fcs = frame.fcs ?? 0;
  const fcsBytes = uint32BE(fcs);
  const rawBytes = buildEthernetFrameBytes(frame);

  return {
    bytes: rawBytes,
    fields: [
      {
        name: 'Preamble + SFD',
        layer: 'L2',
        byteOffset: 0,
        byteLength: preambleBytes.length,
        displayValue: formatByteSequenceHex(preambleBytes),
      },
      {
        name: 'Dst MAC',
        layer: 'L2',
        byteOffset: preambleBytes.length + 0,
        byteLength: 6,
        displayValue: frame.dstMac,
      },
      {
        name: 'Src MAC',
        layer: 'L2',
        byteOffset: preambleBytes.length + 6,
        byteLength: 6,
        displayValue: frame.srcMac,
      },
      {
        name: 'EtherType',
        layer: 'L2',
        byteOffset: preambleBytes.length + 12,
        byteLength: 2,
        displayValue: `${formatHex(frame.etherType, 4)} (IPv4)`,
      },
      ...l3Result.fields,
      {
        name: 'FCS',
        layer: 'L2',
        byteOffset: rawBytes.length - fcsBytes.length,
        byteLength: fcsBytes.length,
        displayValue: formatHex(fcs, 8),
      },
    ],
  };
}

function finalizeSerializedPacket(rawBytes: number[], fields: AnnotatedField[]): SerializedPacket {
  const annotations: LayerTag[] = new Array<LayerTag>(rawBytes.length).fill('raw');

  for (const field of fields) {
    for (let i = 0; i < field.byteLength; i++) {
      annotations[field.byteOffset + i] = field.layer;
    }
  }

  return {
    bytes: Uint8Array.from(rawBytes),
    annotations,
    fields,
  };
}

export function serializePacket(frame: EthernetFrame): SerializedPacket {
  const { bytes: rawBytes, fields } = serializeL2(frame);
  return finalizeSerializedPacket(rawBytes, fields);
}

export function serializeArpFrame(frame: ArpEthernetFrame): SerializedPacket {
  const fcs = frame.fcs ?? 0;
  const operation = frame.payload.operation === 'request' ? 1 : 2;
  const rawBytes = [
    ...macToBytes(frame.dstMac),
    ...macToBytes(frame.srcMac),
    0x08,
    0x06,
    0x00,
    0x01,
    0x08,
    0x00,
    0x06,
    0x04,
    ...uint16BE(operation),
    ...macToBytes(frame.payload.senderMac),
    ...ipToBytes(frame.payload.senderIp),
    ...macToBytes(frame.payload.targetMac),
    ...ipToBytes(frame.payload.targetIp),
    ...uint32BE(fcs),
  ];

  const fields: AnnotatedField[] = [
    { name: 'Dst MAC', layer: 'L2', byteOffset: 0, byteLength: 6, displayValue: frame.dstMac },
    { name: 'Src MAC', layer: 'L2', byteOffset: 6, byteLength: 6, displayValue: frame.srcMac },
    { name: 'EtherType', layer: 'L2', byteOffset: 12, byteLength: 2, displayValue: `${formatHex(frame.etherType, 4)} (ARP)` },
    { name: 'Hardware Type', layer: 'ARP', byteOffset: 14, byteLength: 2, displayValue: '0x0001 (Ethernet)' },
    { name: 'Protocol Type', layer: 'ARP', byteOffset: 16, byteLength: 2, displayValue: '0x0800 (IPv4)' },
    { name: 'HW Length', layer: 'ARP', byteOffset: 18, byteLength: 1, displayValue: '6' },
    { name: 'Proto Length', layer: 'ARP', byteOffset: 19, byteLength: 1, displayValue: '4' },
    {
      name: 'Operation',
      layer: 'ARP',
      byteOffset: 20,
      byteLength: 2,
      displayValue: `${formatHex(operation, 4)} (${frame.payload.operation.toUpperCase()})`,
    },
    {
      name: 'Sender MAC',
      layer: 'ARP',
      byteOffset: 22,
      byteLength: 6,
      displayValue: frame.payload.senderMac,
    },
    {
      name: 'Sender IP',
      layer: 'ARP',
      byteOffset: 28,
      byteLength: 4,
      displayValue: frame.payload.senderIp,
    },
    {
      name: 'Target MAC',
      layer: 'ARP',
      byteOffset: 32,
      byteLength: 6,
      displayValue: frame.payload.targetMac,
    },
    {
      name: 'Target IP',
      layer: 'ARP',
      byteOffset: 38,
      byteLength: 4,
      displayValue: frame.payload.targetIp,
    },
    {
      name: 'FCS',
      layer: 'L2',
      byteOffset: 42,
      byteLength: 4,
      displayValue: formatHex(fcs, 8),
    },
  ];

  return finalizeSerializedPacket(rawBytes, fields);
}
