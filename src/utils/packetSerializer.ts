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
  EthernetFrame,
  IpPacket,
  TcpSegment,
  UdpDatagram,
  HttpMessage,
  RawPayload,
} from '../types/packets';

// ── Public types ──────────────────────────────────────────────────────────────

export type LayerTag = 'L2' | 'L3' | 'L4' | 'L7' | 'raw';

export interface AnnotatedField {
  name: string;
  layer: LayerTag;
  byteOffset: number;   // absolute offset from start of Ethernet frame
  byteLength: number;
  displayValue: string; // human-readable decoded value
}

export interface SerializedPacket {
  bytes: Uint8Array;
  annotations: LayerTag[];  // parallel array: annotations[i] = layer tag for byte i
  fields: AnnotatedField[];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function parseMac(mac: string): number[] {
  return mac.split(':').map((h) => parseInt(h, 16));
}

function parseIp(ip: string): number[] {
  return ip.split('.').map(Number);
}

// RFC 791 §3.1 — 16-bit fields are transmitted in network byte order (big-endian)
function uint16BE(n: number): [number, number] {
  return [(n >> 8) & 0xff, n & 0xff];
}

// RFC 9293 §3.1 — 32-bit fields in big-endian network byte order
function uint32BE(n: number): [number, number, number, number] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

// ── L7 serialization ──────────────────────────────────────────────────────────

interface LayerResult {
  bytes: number[];
  fields: AnnotatedField[];
}

function serializeL7(
  payload: HttpMessage | RawPayload,
  baseOffset: number,
): LayerResult {
  const enc = new TextEncoder();

  if (payload.layer === 'raw') {
    const raw = enc.encode(payload.data);
    const bytes = Array.from(raw);
    const fields: AnnotatedField[] = [
      {
        name: 'Data',
        layer: 'raw',
        byteOffset: baseOffset,
        byteLength: bytes.length,
        displayValue: payload.data,
      },
    ];
    return { bytes, fields };
  }

  // HttpMessage — RFC 9112 §2.1: request-line / status-line followed by headers
  const { method, url, statusCode, headers, body } = payload;
  let text: string;
  if (method !== undefined) {
    // Request
    text = `${method} ${url ?? '/'} HTTP/1.1\r\n`;
  } else {
    // Response
    text = `HTTP/1.1 ${statusCode ?? 200} OK\r\n`;
  }
  for (const [k, v] of Object.entries(headers)) {
    text += `${k}: ${v}\r\n`;
  }
  text += '\r\n';
  if (body) text += body;

  const raw = enc.encode(text);
  const bytes = Array.from(raw);
  const fields: AnnotatedField[] = [
    {
      name: 'HTTP Payload',
      layer: 'L7',
      byteOffset: baseOffset,
      byteLength: bytes.length,
      displayValue: text.slice(0, 80) + (text.length > 80 ? '…' : ''),
    },
  ];
  return { bytes, fields };
}

// ── L4 TCP serialization ──────────────────────────────────────────────────────

function serializeTcp(tcp: TcpSegment, baseOffset: number): LayerResult {
  const { srcPort, dstPort, seq, ack, flags } = tcp;

  // RFC 9293 §3.1 — TCP Header Format
  const flagsByte =
    ((flags.urg ? 1 : 0) << 5) |
    ((flags.ack ? 1 : 0) << 4) |
    ((flags.psh ? 1 : 0) << 3) |
    ((flags.rst ? 1 : 0) << 2) |
    ((flags.syn ? 1 : 0) << 1) |
    (flags.fin ? 1 : 0);

  const activeFlags = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k.toUpperCase())
    .join('+');

  const headerFields: AnnotatedField[] = [
    // RFC 9293 §3.1 — Source Port (16 bits)
    { name: 'Src Port', layer: 'L4', byteOffset: baseOffset + 0, byteLength: 2, displayValue: String(srcPort) },
    // RFC 9293 §3.1 — Destination Port (16 bits)
    { name: 'Dst Port', layer: 'L4', byteOffset: baseOffset + 2, byteLength: 2, displayValue: String(dstPort) },
    // RFC 9293 §3.1 — Sequence Number (32 bits)
    { name: 'Seq Number', layer: 'L4', byteOffset: baseOffset + 4, byteLength: 4, displayValue: String(seq) },
    // RFC 9293 §3.1 — Acknowledgment Number (32 bits)
    { name: 'Ack Number', layer: 'L4', byteOffset: baseOffset + 8, byteLength: 4, displayValue: String(ack) },
    // RFC 9293 §3.1 — Data Offset (4 bits) + Reserved (4 bits)
    { name: 'Data Offset', layer: 'L4', byteOffset: baseOffset + 12, byteLength: 1, displayValue: '0x50 (20 bytes)' },
    // RFC 9293 §3.1 — Control Bits (8 bits)
    { name: 'Flags', layer: 'L4', byteOffset: baseOffset + 13, byteLength: 1, displayValue: `0x${flagsByte.toString(16).padStart(2, '0')} (${activeFlags || 'none'})` },
    // RFC 9293 §3.1 — Window Size (16 bits)
    { name: 'Window Size', layer: 'L4', byteOffset: baseOffset + 14, byteLength: 2, displayValue: '65535' },
    // RFC 9293 §3.1 — Checksum (16 bits)
    { name: 'Checksum', layer: 'L4', byteOffset: baseOffset + 16, byteLength: 2, displayValue: '0x0000 (not computed)' },
    // RFC 9293 §3.1 — Urgent Pointer (16 bits)
    { name: 'Urgent Pointer', layer: 'L4', byteOffset: baseOffset + 18, byteLength: 2, displayValue: '0' },
  ];

  const headerBytes: number[] = [
    ...uint16BE(srcPort),
    ...uint16BE(dstPort),
    ...uint32BE(seq),
    ...uint32BE(ack),
    0x50,        // data offset = 5 (× 4 = 20 bytes), reserved = 0
    flagsByte,
    0xff, 0xff,  // window size = 65535
    0x00, 0x00,  // checksum (not computed)
    0x00, 0x00,  // urgent pointer
  ];

  const payloadBase = baseOffset + headerBytes.length;
  const { bytes: payloadBytes, fields: payloadFields } = serializeL7(tcp.payload, payloadBase);

  return {
    bytes: [...headerBytes, ...payloadBytes],
    fields: [...headerFields, ...payloadFields],
  };
}

// ── L4 UDP serialization ──────────────────────────────────────────────────────

function serializeUdp(udp: UdpDatagram, baseOffset: number): LayerResult {
  const enc = new TextEncoder();
  const payloadBytes = Array.from(enc.encode(udp.payload.data));
  const length = 8 + payloadBytes.length;

  // RFC 768 — UDP Header Format
  const headerFields: AnnotatedField[] = [
    // RFC 768 — Source Port (16 bits)
    { name: 'Src Port', layer: 'L4', byteOffset: baseOffset + 0, byteLength: 2, displayValue: String(udp.srcPort) },
    // RFC 768 — Destination Port (16 bits)
    { name: 'Dst Port', layer: 'L4', byteOffset: baseOffset + 2, byteLength: 2, displayValue: String(udp.dstPort) },
    // RFC 768 — Length (16 bits): 8 (header) + data length
    { name: 'Length', layer: 'L4', byteOffset: baseOffset + 4, byteLength: 2, displayValue: String(length) },
    // RFC 768 — Checksum (16 bits)
    { name: 'Checksum', layer: 'L4', byteOffset: baseOffset + 6, byteLength: 2, displayValue: '0x0000 (not computed)' },
  ];

  const payloadField: AnnotatedField = {
    name: 'Data',
    layer: 'raw',
    byteOffset: baseOffset + 8,
    byteLength: payloadBytes.length,
    displayValue: udp.payload.data,
  };

  const headerBytes: number[] = [
    ...uint16BE(udp.srcPort),
    ...uint16BE(udp.dstPort),
    ...uint16BE(length),
    0x00, 0x00,  // checksum
  ];

  return {
    bytes: [...headerBytes, ...payloadBytes],
    fields: [...headerFields, ...(payloadBytes.length > 0 ? [payloadField] : [])],
  };
}

// ── L3 IPv4 serialization ─────────────────────────────────────────────────────

function serializeL3(ip: IpPacket, baseOffset: number): LayerResult {
  const l4Base = baseOffset + 20;
  const l4Result =
    ip.payload.layer === 'L4' && 'seq' in ip.payload
      ? serializeTcp(ip.payload as TcpSegment, l4Base)
      : serializeUdp(ip.payload as UdpDatagram, l4Base);

  const totalLength = 20 + l4Result.bytes.length;

  // RFC 791 §3.1 — IPv4 Header Format
  const headerFields: AnnotatedField[] = [
    // RFC 791 §3.1 — Version (4 bits) + IHL (4 bits)
    { name: 'Version + IHL', layer: 'L3', byteOffset: baseOffset + 0, byteLength: 1, displayValue: '0x45 (IPv4, 20-byte header)' },
    // RFC 791 §3.1 — Type of Service (8 bits)
    { name: 'DSCP / ECN', layer: 'L3', byteOffset: baseOffset + 1, byteLength: 1, displayValue: '0x00' },
    // RFC 791 §3.1 — Total Length (16 bits)
    { name: 'Total Length', layer: 'L3', byteOffset: baseOffset + 2, byteLength: 2, displayValue: String(totalLength) },
    // RFC 791 §3.1 — Identification (16 bits)
    { name: 'Identification', layer: 'L3', byteOffset: baseOffset + 4, byteLength: 2, displayValue: '0x0000' },
    // RFC 791 §3.1 — Flags (3 bits) + Fragment Offset (13 bits)
    { name: 'Flags + Frag Offset', layer: 'L3', byteOffset: baseOffset + 6, byteLength: 2, displayValue: '0x4000 (DF=1)' },
    // RFC 791 §3.1 — Time to Live (8 bits)
    { name: 'TTL', layer: 'L3', byteOffset: baseOffset + 8, byteLength: 1, displayValue: String(ip.ttl) },
    // RFC 791 §3.1 — Protocol (8 bits)
    { name: 'Protocol', layer: 'L3', byteOffset: baseOffset + 9, byteLength: 1, displayValue: `${ip.protocol} (${ip.protocol === 6 ? 'TCP' : ip.protocol === 17 ? 'UDP' : String(ip.protocol)})` },
    // RFC 791 §3.1 — Header Checksum (16 bits)
    { name: 'Header Checksum', layer: 'L3', byteOffset: baseOffset + 10, byteLength: 2, displayValue: '0x0000 (not computed)' },
    // RFC 791 §3.1 — Source Address (32 bits)
    { name: 'Src IP', layer: 'L3', byteOffset: baseOffset + 12, byteLength: 4, displayValue: ip.srcIp },
    // RFC 791 §3.1 — Destination Address (32 bits)
    { name: 'Dst IP', layer: 'L3', byteOffset: baseOffset + 16, byteLength: 4, displayValue: ip.dstIp },
  ];

  const headerBytes: number[] = [
    0x45,                        // version=4, IHL=5
    0x00,                        // DSCP/ECN
    ...uint16BE(totalLength),    // total length
    0x00, 0x00,                  // identification
    0x40, 0x00,                  // flags (DF=1) + fragment offset = 0
    ip.ttl & 0xff,               // TTL
    ip.protocol & 0xff,          // protocol
    0x00, 0x00,                  // header checksum (not computed)
    ...parseIp(ip.srcIp),        // source address
    ...parseIp(ip.dstIp),        // destination address
  ];

  return {
    bytes: [...headerBytes, ...l4Result.bytes],
    fields: [...headerFields, ...l4Result.fields],
  };
}

// ── L2 Ethernet serialization ─────────────────────────────────────────────────

function serializeL2(frame: EthernetFrame): LayerResult {
  const l3Base = 14;
  const l3Result = serializeL3(frame.payload, l3Base);

  // RFC 894 — Ethernet II frame header
  const headerFields: AnnotatedField[] = [
    // Destination MAC Address (48 bits)
    { name: 'Dst MAC', layer: 'L2', byteOffset: 0, byteLength: 6, displayValue: frame.dstMac },
    // Source MAC Address (48 bits)
    { name: 'Src MAC', layer: 'L2', byteOffset: 6, byteLength: 6, displayValue: frame.srcMac },
    // EtherType (16 bits): 0x0800 = IPv4
    { name: 'EtherType', layer: 'L2', byteOffset: 12, byteLength: 2, displayValue: `0x${frame.etherType.toString(16).padStart(4, '0').toUpperCase()} (IPv4)` },
  ];

  const headerBytes: number[] = [
    ...parseMac(frame.dstMac),
    ...parseMac(frame.srcMac),
    ...uint16BE(frame.etherType),
  ];

  return {
    bytes: [...headerBytes, ...l3Result.bytes],
    fields: [...headerFields, ...l3Result.fields],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Serialize an EthernetFrame into a byte array with per-byte layer annotations
 * and a list of named protocol fields.
 *
 * The byte layout follows the RFCs listed at the top of this file.
 */
export function serializePacket(frame: EthernetFrame): SerializedPacket {
  const { bytes: rawBytes, fields } = serializeL2(frame);

  // Build parallel annotations array from fields
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
