import type {
  DhcpMessage,
  DnsMessage,
  InFlightPacket,
  RawPayload,
  UdpDatagram,
} from '../../types/packets';
import {
  UDP_EPHEMERAL_PORT_MAX,
  UDP_EPHEMERAL_PORT_MIN,
  UDP_MAX_PORT,
  UDP_MIN_PORT,
  UDP_PROTOCOL,
} from '../../types/udp';

export interface UdpPacketOptions {
  srcNodeId: string;
  dstNodeId: string;
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  ttl?: number;
  sessionId?: string;
  payload?: RawPayload | DhcpMessage | DnsMessage;
  /** Override destination MAC (e.g. for broadcast). */
  dstMac?: string;
  /** Override source MAC. */
  srcMac?: string;
  /** Override packet timestamp (default: Date.now()). Useful for deterministic tests. */
  timestamp?: number;
  /** Override the packet ID (default: `udp-<hash>`). */
  packetId?: string;
  /** Set the DF (Don't Fragment) bit. Default: false (UDP allows fragmentation). */
  df?: boolean;
}

function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function makePacketId(prefix: string, options: UdpPacketOptions, ts: number): string {
  return `${prefix}-${hashString(
    [
      options.srcNodeId,
      options.dstNodeId,
      String(options.srcPort),
      String(options.dstPort),
      options.sessionId ?? '',
      String(ts),
    ].join(':'),
  ).toString(16)}`;
}

/**
 * Compute the UDP length field: header (8 bytes) + estimated payload size.
 *
 * Uses `JSON.stringify(payload).length` as an educational stand-in for actual
 * byte-level serialisation. This is intentionally simplified for visual/educational
 * purposes and does not match real UDP header length calculation.
 */
function computeUdpLength(payload: UdpDatagram['payload']): number {
  const UDP_HEADER_SIZE = 8;
  return UDP_HEADER_SIZE + JSON.stringify(payload).length;
}

function validatePort(port: number, name: string): void {
  if (port < UDP_MIN_PORT || port > UDP_MAX_PORT) {
    throw new RangeError(`${name} must be in [${UDP_MIN_PORT}, ${UDP_MAX_PORT}], got ${port}`);
  }
}

/**
 * Build a fully-encapsulated UDP InFlightPacket (L2 → L3 → L4 → payload).
 *
 * Mirrors the TCP builder pattern but produces `UdpDatagram` at L4 with
 * `protocol = 17`.
 */
export function buildUdpPacket(options: UdpPacketOptions): InFlightPacket {
  validatePort(options.srcPort, 'srcPort');
  validatePort(options.dstPort, 'dstPort');

  const innerPayload: UdpDatagram['payload'] = options.payload ?? {
    layer: 'raw' as const,
    data: '',
  };

  const ts = options.timestamp ?? Date.now();
  const id = options.packetId ?? makePacketId('udp', options, ts);
  const df = options.df ?? false;

  return {
    id,
    srcNodeId: options.srcNodeId,
    dstNodeId: options.dstNodeId,
    currentDeviceId: options.srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: ts,
    ...(options.sessionId !== undefined ? { sessionId: options.sessionId } : {}),
    frame: {
      layer: 'L2',
      srcMac: options.srcMac ?? '00:00:00:00:00:00',
      dstMac: options.dstMac ?? '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: options.srcIp,
        dstIp: options.dstIp,
        ttl: options.ttl ?? 64,
        protocol: UDP_PROTOCOL,
        flags: { df, mf: false },
        payload: {
          layer: 'L4',
          srcPort: options.srcPort,
          dstPort: options.dstPort,
          length: computeUdpLength(innerPayload),
          payload: innerPayload,
        },
      },
    },
  };
}

/**
 * Deterministic ephemeral port in the 49152–65535 range for a given (nodeId, seed).
 *
 * Uses FNV-1a hashing to map (nodeId, seed) to the IANA ephemeral port range.
 */
export function generateEphemeralPort(nodeId: string, seed: string): number {
  const range = UDP_EPHEMERAL_PORT_MAX - UDP_EPHEMERAL_PORT_MIN + 1;
  return UDP_EPHEMERAL_PORT_MIN + (hashString(`${nodeId}:${seed}`) % range);
}
