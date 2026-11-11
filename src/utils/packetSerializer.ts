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
 *   - L7 DNS:       RFC 1035 https://www.rfc-editor.org/rfc/rfc1035
 */

import type {
  ArpEthernetFrame,
  DhcpMessage,
  DnsMessage,
  EthernetFrame,
  HttpMessage,
  IcmpMessage,
  IpPacket,
  Ipv6Packet,
  RawPayload,
  TcpSegment,
  UdpDatagram,
} from '../types/packets';
import {
  DEFAULT_ETHERNET_PREAMBLE,
  buildApplicationPayloadBytes,
  buildArpFrameBytes,
  buildEthernetFrameBytes,
  buildIcmpMessageBytes,
  buildIpv4FlagsAndFragmentOffset,
  buildIpv4HeaderBytes,
  buildIpv4PayloadBytes,
  buildIpv6HeaderBytes,
  buildIpv6PayloadBytes,
  getIcmpv6Codec,
  buildTcpFlagsByte,
  formatDhcpMessage,
  formatHttpMessage,
  isIcmpMessage,
  isRawPayload,
  isTcpSegment,
  rawStringToBytes,
  uint16BE,
  uint32BE,
} from './packetLayout';
import { dnsMessageToValues, dnsWire } from '../protocols/dns/wire';
import { greHeaderToValues } from '../protocols/gre/values';
import { ipv6ToValues } from '../protocols/ipv6/values';
import { deriveAnnotatedFields } from '../protocols/pack/wire';
import { protocolPacks } from '../protocols/packs';
import type { HeaderValues } from '../protocols/pack/types';
import type { GreRawPayload, VxlanRawPayload } from '../types/tunneling';
import { isIpv6Packet } from '../types/packets';
import { getRequired } from './typedAccess';

export type LayerTag = 'L2' | 'L3' | 'L4' | 'L7' | 'ARP' | 'raw';

export interface AnnotatedField {
  name: string;
  layer: LayerTag;
  byteOffset: number;
  byteLength: number;
  displayValue: string;
  /** What the field means, once the protocol's learn tier is loaded. */
  meaning?: { readonly en: string; readonly ja: string };
  /** The protocol pack this row came from. */
  packId?: string;
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
  if (protocol === 1) return 'ICMP';
  if (protocol === 6) return 'TCP';
  if (protocol === 17) return 'UDP';
  return protocolPacks.byIpProtocol(protocol)?.name.short ?? String(protocol);
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
  if ('vxlan' in payload) return serializeVxlan(payload as VxlanRawPayload, baseOffset);
  const bytes = buildApplicationPayloadBytes(payload);
  if ('questions' in payload) {
    // With the learn tier loaded, the rows carry their meanings (REQ-303).
    const dns = protocolPacks.get('dns') ?? dnsWire;
    return {
      bytes,
      fields: deriveAnnotatedFields(dns, dnsMessageToValues(payload), { baseOffset }),
    };
  }
  const label =
    payload.layer === 'raw' ? 'Data' : 'messageType' in payload ? 'DHCP Payload' : 'HTTP Payload';
  const displayValue =
    payload.layer === 'raw'
      ? payload.data
      : 'messageType' in payload
        ? formatDhcpMessage(payload)
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
      {
        name: 'Src Port',
        layer: 'L4',
        byteOffset: baseOffset + 0,
        byteLength: 2,
        displayValue: String(tcp.srcPort),
      },
      {
        name: 'Dst Port',
        layer: 'L4',
        byteOffset: baseOffset + 2,
        byteLength: 2,
        displayValue: String(tcp.dstPort),
      },
      {
        name: 'Seq Number',
        layer: 'L4',
        byteOffset: baseOffset + 4,
        byteLength: 4,
        displayValue: String(tcp.seq),
      },
      {
        name: 'Ack Number',
        layer: 'L4',
        byteOffset: baseOffset + 8,
        byteLength: 4,
        displayValue: String(tcp.ack),
      },
      {
        name: 'Data Offset',
        layer: 'L4',
        byteOffset: baseOffset + 12,
        byteLength: 1,
        displayValue: '0x50 (20 bytes)',
      },
      {
        name: 'Flags',
        layer: 'L4',
        byteOffset: baseOffset + 13,
        byteLength: 1,
        displayValue: `${formatHex(flagsByte, 2)} (${activeFlags || 'none'})`,
      },
      {
        name: 'Window Size',
        layer: 'L4',
        byteOffset: baseOffset + 14,
        byteLength: 2,
        displayValue: String(windowSize),
      },
      {
        name: 'Checksum',
        layer: 'L4',
        byteOffset: baseOffset + 16,
        byteLength: 2,
        displayValue: `${formatHex(checksum, 4)} (simulated)`,
      },
      {
        name: 'Urgent Pointer',
        layer: 'L4',
        byteOffset: baseOffset + 18,
        byteLength: 2,
        displayValue: String(urgentPointer),
      },
      ...payloadResult.fields,
    ],
  };
}

function serializeUdp(udp: UdpDatagram, baseOffset: number): LayerResult {
  const payloadResult = serializeL7(udp.payload, baseOffset + 8);
  const length = udp.length ?? 8 + payloadResult.bytes.length;
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
      {
        name: 'Src Port',
        layer: 'L4',
        byteOffset: baseOffset + 0,
        byteLength: 2,
        displayValue: String(udp.srcPort),
      },
      {
        name: 'Dst Port',
        layer: 'L4',
        byteOffset: baseOffset + 2,
        byteLength: 2,
        displayValue: String(udp.dstPort),
      },
      {
        name: 'Length',
        layer: 'L4',
        byteOffset: baseOffset + 4,
        byteLength: 2,
        displayValue: String(length),
      },
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

function serializeIcmp(icmp: IcmpMessage, baseOffset: number): LayerResult {
  const bytes = buildIcmpMessageBytes(icmp);
  const dataBytes = icmp.data ? Uint8Array.from(rawStringToBytes(icmp.data)) : new Uint8Array();

  return {
    bytes,
    fields: [
      {
        name: 'Type',
        layer: 'L4',
        byteOffset: baseOffset + 0,
        byteLength: 1,
        displayValue: String(icmp.type),
      },
      {
        name: 'Code',
        layer: 'L4',
        byteOffset: baseOffset + 1,
        byteLength: 1,
        displayValue: String(icmp.code),
      },
      {
        name: 'Checksum',
        layer: 'L4',
        byteOffset: baseOffset + 2,
        byteLength: 2,
        displayValue: `${formatHex(icmp.checksum, 4)} (simulated)`,
      },
      {
        name: 'Identifier',
        layer: 'L4',
        byteOffset: baseOffset + 4,
        byteLength: 2,
        displayValue: String(icmp.identifier ?? 0),
      },
      {
        name: 'Sequence Number',
        layer: 'L4',
        byteOffset: baseOffset + 6,
        byteLength: 2,
        displayValue: String(icmp.sequenceNumber ?? 0),
      },
      ...(dataBytes.length > 0
        ? [
            {
              name: 'Data',
              layer: 'raw' as const,
              byteOffset: baseOffset + 8,
              byteLength: dataBytes.length,
              displayValue: icmp.data ?? '',
            },
          ]
        : []),
    ],
  };
}

/** The GRE header, then the inner packet, as rows (REQ-304). */
/**
 * A tunnel header's rows from its pack once loaded; until then one row over its bytes
 * (REQ-332). The viewer loads the pack when the packet is shown.
 */
function tunnelHeader(
  id: string,
  values: HeaderValues,
  baseOffset: number,
  byteLength: number,
  name: string,
): AnnotatedField[] {
  const wire = protocolPacks.get(id) ?? protocolPacks.wire(id);
  return wire
    ? deriveAnnotatedFields(wire, values, { baseOffset })
    : [{ name, layer: 'L3', byteOffset: baseOffset, byteLength, displayValue: '', packId: id }];
}

const inner = (fields: readonly AnnotatedField[]) =>
  fields.map((field) => ({ ...field, name: `Inner ${field.name}` }));

function serializeGre(payload: GreRawPayload, baseOffset: number): LayerResult {
  const { header: gre } = payload.gre;
  const length = 4 + 4 * [gre.hasChecksum, gre.hasKey, gre.hasSequence].filter(Boolean).length;
  return {
    bytes: buildApplicationPayloadBytes(payload),
    fields: [
      ...tunnelHeader('gre', greHeaderToValues(gre), baseOffset, length, 'GRE Header'),
      ...inner(serializeL3(payload.gre.inner, baseOffset + length).fields),
    ],
  };
}

/** VXLAN (REQ-332): the header, then the inner Ethernet frame and its packet. */
function serializeVxlan(payload: VxlanRawPayload, baseOffset: number): LayerResult {
  const frame = payload.vxlan.inner;
  const at = baseOffset + 8;
  const row = (name: string, offset: number, byteLength: number, displayValue: string) => ({
    name,
    layer: 'L2' as const,
    byteOffset: at + offset,
    byteLength,
    displayValue,
  });
  return {
    bytes: buildApplicationPayloadBytes(payload),
    fields: [
      ...tunnelHeader(
        'vxlan',
        { i: 1, vni: payload.vxlan.header.vni },
        baseOffset,
        8,
        'VXLAN Header',
      ),
      ...inner([
        row('Dst MAC', 0, 6, frame.dstMac),
        row('Src MAC', 6, 6, frame.srcMac),
        row('EtherType', 12, 2, formatHex(frame.etherType, 4)),
      ]),
      ...(isIpv6Packet(frame.payload) ? [] : inner(serializeL3(frame.payload, at + 14).fields)),
    ],
  };
}

function serializeL3(ip: IpPacket, baseOffset: number): LayerResult {
  const headerBytes = buildIpv4HeaderBytes(ip);
  const headerLength = headerBytes.length;
  const l4Base = baseOffset + headerLength;
  const l4Result =
    'gre' in ip.payload
      ? serializeGre(ip.payload as GreRawPayload, l4Base)
      : isRawPayload(ip.payload)
        ? serializeL7(ip.payload, l4Base)
        : isTcpSegment(ip.payload)
          ? serializeTcp(ip.payload, l4Base)
          : isIcmpMessage(ip.payload)
            ? serializeIcmp(ip.payload, l4Base)
            : 'igmpType' in ip.payload
              ? { bytes: [], fields: [] }
              : serializeUdp(ip.payload, l4Base);
  const payloadBytes = buildIpv4PayloadBytes(ip);
  const totalLength = ip.totalLength ?? headerLength + payloadBytes.length;
  const identification = ip.identification ?? 0;
  const versionAndIhl = getRequired(headerBytes, 0, { baseOffset, field: 'version-ihl' });
  const dscpAndEcn = getRequired(headerBytes, 1, { baseOffset, field: 'dscp-ecn' });

  return {
    bytes: [...headerBytes, ...payloadBytes],
    fields: [
      {
        name: 'Version + IHL',
        layer: 'L3',
        byteOffset: baseOffset + 0,
        byteLength: 1,
        displayValue: `${formatHex(versionAndIhl, 2)} (IPv4, ${(ip.ihl ?? 5) * 4}-byte header)`,
      },
      {
        name: 'DSCP / ECN',
        layer: 'L3',
        byteOffset: baseOffset + 1,
        byteLength: 1,
        displayValue: formatHex(dscpAndEcn, 2),
      },
      {
        name: 'Total Length',
        layer: 'L3',
        byteOffset: baseOffset + 2,
        byteLength: 2,
        displayValue: String(totalLength),
      },
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
      {
        name: 'TTL',
        layer: 'L3',
        byteOffset: baseOffset + 8,
        byteLength: 1,
        displayValue: String(ip.ttl),
      },
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
      {
        name: 'Src IP',
        layer: 'L3',
        byteOffset: baseOffset + 12,
        byteLength: 4,
        displayValue: ip.srcIp,
      },
      {
        name: 'Dst IP',
        layer: 'L3',
        byteOffset: baseOffset + 16,
        byteLength: 4,
        displayValue: ip.dstIp,
      },
      ...l4Result.fields,
    ],
  };
}

/**
 * An IPv6 packet: the IPv6 header, then ICMPv6/ND, TCP or UDP rows (REQ-323). The
 * IPv6 and ICMPv6 rows come from their packs once loaded (the viewer loads them on
 * show); until then each is one row, so this stays synchronous.
 */
function serializeIpv6(ip: Ipv6Packet, baseOffset: number): LayerResult {
  const payloadBytes = buildIpv6PayloadBytes(ip);
  const ipv6 = protocolPacks.get('ipv6') ?? protocolPacks.wire('ipv6');
  const coarse = (name: string, packId: string, at: number, byteLength: number) => ({
    name,
    layer: 'L3' as const,
    byteOffset: at,
    byteLength,
    displayValue: '',
    packId,
  });
  const header = ipv6
    ? deriveAnnotatedFields(ipv6, ipv6ToValues(ip, payloadBytes.length), { baseOffset })
    : [coarse('IPv6 Header', 'ipv6', baseOffset, 40)];
  const at = baseOffset + 40;
  const payload = ip.payload;
  const codec = getIcmpv6Codec();
  const rows =
    ip.nextHeader === 58 && 'type' in payload && 'code' in payload
      ? codec
        ? deriveAnnotatedFields(
            protocolPacks.get(codec.wireFor(payload).id) ?? codec.wireFor(payload),
            codec.values({ ...ip, payload }),
            { baseOffset: at },
          )
        : [coarse('ICMPv6 Message', 'icmpv6', at, payloadBytes.length)]
      : isRawPayload(payload)
        ? serializeL7(payload, at).fields
        : isTcpSegment(payload)
          ? serializeTcp(payload, at).fields
          : 'srcPort' in payload
            ? serializeUdp(payload, at).fields
            : [];
  return { bytes: [...buildIpv6HeaderBytes(ip), ...payloadBytes], fields: [...header, ...rows] };
}

function serializeL2(frame: EthernetFrame): LayerResult {
  const preambleBytes = frame.preamble ?? DEFAULT_ETHERNET_PREAMBLE;
  const labels = frame.mplsStack ?? [];
  const l3Base = preambleBytes.length + 14 + 4 * labels.length;
  const ipv6 = isIpv6Packet(frame.payload);
  const l3Result = isIpv6Packet(frame.payload)
    ? serializeIpv6(frame.payload, l3Base)
    : serializeL3(frame.payload, l3Base);
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
        displayValue: `${formatHex(frame.etherType, 4)} (${labels.length ? 'MPLS' : ipv6 ? 'IPv6' : 'IPv4'})`,
      },
      ...(labels.length
        ? tunnelHeader(
            'mpls',
            {
              stack: labels.map((l) => ({
                label: l.label,
                tc: l.tc,
                s: l.endOfStack ? 1 : 0,
                ttl: l.ttl,
              })),
            },
            l3Base - 4 * labels.length,
            4 * labels.length,
            'MPLS Label Stack',
          )
        : []),
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
  const rawBytes = buildArpFrameBytes(frame);

  const fields: AnnotatedField[] = [
    { name: 'Dst MAC', layer: 'L2', byteOffset: 0, byteLength: 6, displayValue: frame.dstMac },
    { name: 'Src MAC', layer: 'L2', byteOffset: 6, byteLength: 6, displayValue: frame.srcMac },
    {
      name: 'EtherType',
      layer: 'L2',
      byteOffset: 12,
      byteLength: 2,
      displayValue: `${formatHex(frame.etherType, 4)} (ARP)`,
    },
    {
      name: 'Hardware Type',
      layer: 'ARP',
      byteOffset: 14,
      byteLength: 2,
      displayValue: '0x0001 (Ethernet)',
    },
    {
      name: 'Protocol Type',
      layer: 'ARP',
      byteOffset: 16,
      byteLength: 2,
      displayValue: '0x0800 (IPv4)',
    },
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
