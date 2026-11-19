/**
 * The QUIC connection-migration and 0-RTT lesson (REQ-393).
 *
 * Part 1: a server finds the connection a packet belongs to. TCP looks it up
 * by the 4-tuple (addresses and ports), QUIC by the destination connection ID
 * (RFC 9000 §5.1). When the phone's address or port changes, the TCP lookup
 * misses and the connection has to be opened again; the QUIC lookup still
 * hits, and the server validates the new path with PATH_CHALLENGE /
 * PATH_RESPONSE (RFC 9000 §8.2, §9).
 *
 * Simplified: every exchange takes exactly one round trip on the path in use;
 * the phone's OS tells the app at once that it changed networks (no timeout);
 * TCP reconnects with a full TLS 1.3 handshake; the QUIC server has issued
 * spare connection IDs and has not disabled migration; "data flows again" for
 * QUIC means once the new path is validated (before that the server may send
 * only three times what it received from the new address, RFC 9000 §8).
 *
 * Part 2: round trips before the request can leave, and the time to the first
 * response byte, for TCP + TLS 1.3, QUIC, and their 0-RTT resumptions
 * (RFC 8446 §2.3, RFC 9001 §4.6). 0-RTT data can be replayed, so here it is
 * used only for safe methods; anything else waits for the handshake.
 */

export type Transport = 'tcp' | 'quic';
export type PathChange = 'none' | 'new-network' | 'port-only';

export const TRANSPORTS: readonly Transport[] = ['tcp', 'quic'];
export const PATH_CHANGES: readonly PathChange[] = ['new-network', 'port-only', 'none'];

export interface Endpoint {
  readonly ip: string;
  readonly port: number;
}

/** The server, and the phone as the server sees it (after the NAT in front of the phone). */
export const SERVER: Endpoint = { ip: '203.0.113.10', port: 443 };
export const WIFI: Endpoint = { ip: '198.51.100.20', port: 51000 };
export const WIFI_REBOUND: Endpoint = { ip: '198.51.100.20', port: 62011 };
export const MOBILE: Endpoint = { ip: '192.0.2.77', port: 40123 };

export const WIFI_RTT_MS = 20;
export const MOBILE_RTT_MS = 60;

/** The connection IDs the server handed to the phone (the first is in use). */
export const ISSUED_CIDS: readonly string[] = [
  '5f1c9a02d4e7b318',
  'b7e04d3c91a2f650',
  '29a8f6e1c03b7d94',
];

export const endpointText = (endpoint: Endpoint) => `${endpoint.ip}:${endpoint.port}`;
const tupleKey = (client: Endpoint) => `${endpointText(client)} → ${endpointText(SERVER)}`;

/** Where the phone sends from after the change, and the round trip of that path. */
export function pathAfter(change: PathChange): {
  readonly client: Endpoint;
  readonly rttMs: number;
} {
  if (change === 'new-network') return { client: MOBILE, rttMs: MOBILE_RTT_MS };
  if (change === 'port-only') return { client: WIFI_REBOUND, rttMs: WIFI_RTT_MS };
  return { client: WIFI, rttMs: WIFI_RTT_MS };
}

export interface Arrival {
  /** What the server holds for the connection. */
  readonly knownKey: string;
  /** What the arriving packet carries for the lookup. */
  readonly arrivingKey: string;
  readonly matched: boolean;
}

/**
 * The phone's next packet after the change reaches the server: does the
 * server find the connection? A QUIC client moving to a new network switches
 * to an unused connection ID (RFC 9000 §9.5) so an observer cannot link the
 * two paths; when only the NAT changed the port, the phone does not know and
 * keeps its ID.
 */
export function arrive(transport: Transport, change: PathChange): Arrival {
  const { client } = pathAfter(change);
  if (transport === 'tcp') {
    const knownKey = tupleKey(WIFI);
    const arrivingKey = tupleKey(client);
    return { knownKey, arrivingKey, matched: arrivingKey === knownKey };
  }
  const arrivingKey = change === 'new-network' ? ISSUED_CIDS[1]! : ISSUED_CIDS[0]!;
  return {
    knownKey: ISSUED_CIDS.join(', '),
    arrivingKey,
    matched: ISSUED_CIDS.includes(arrivingKey),
  };
}

export type Step = 'rst' | 'tcp-handshake' | 'tls-handshake' | 'request' | 'path-validation';

export interface Interruption {
  readonly survives: boolean;
  readonly rttMs: number;
  readonly steps: readonly { readonly step: Step; readonly ms: number }[];
  /** From the phone's first packet on the new path until data flows again. */
  readonly totalMs: number;
  /** Whether the sender starts its congestion window from the beginning again. */
  readonly slowStartAgain: boolean;
}

export function interruption(transport: Transport, change: PathChange): Interruption {
  const { rttMs } = pathAfter(change);
  const survives = arrive(transport, change).matched;
  let steps: Step[] = [];
  if (change !== 'none') {
    if (survives) steps = ['path-validation'];
    else {
      // The phone knows its old address is gone and reconnects; after a NAT
      // rebinding it does not know, and learns from the server's RST.
      steps = ['tcp-handshake', 'tls-handshake', 'request'];
      if (change === 'port-only') steps.unshift('rst');
    }
  }
  const timed = steps.map((step) => ({ step, ms: rttMs }));
  return {
    survives,
    rttMs,
    steps: timed,
    totalMs: timed.reduce((sum, entry) => sum + entry.ms, 0),
    // A new connection starts slow; QUIC resets congestion control on a new
    // path unless only the port changed (RFC 9000 §9.4).
    slowStartAgain: !survives || change === 'new-network',
  };
}

export type Setup = 'tcp-tls' | 'tcp-tls-0rtt' | 'quic' | 'quic-0rtt';
export const SETUPS: readonly Setup[] = ['tcp-tls', 'tcp-tls-0rtt', 'quic', 'quic-0rtt'];

/** Methods that are safe to replay, the only ones sent as 0-RTT data here. */
export const SAFE_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS'];

export function mayUseZeroRtt(method: string): boolean {
  return SAFE_METHODS.includes(method.toUpperCase());
}

/** Round trips before the request can leave the client. */
export function roundTripsBeforeRequest(setup: Setup, method: string): number {
  const transport = setup.startsWith('tcp') ? 1 : 0; // TCP's SYN / SYN-ACK
  const zeroRtt = setup.endsWith('0rtt') && mayUseZeroRtt(method);
  const tls = zeroRtt ? 0 : 1; // the TLS 1.3 handshake, inside QUIC's first flight for QUIC
  return transport + tls;
}

export interface FirstByte {
  readonly roundTripsBeforeRequest: number;
  readonly requestLeavesMs: number;
  readonly firstByteMs: number;
}

/** The response starts one round trip after the request leaves. */
export function timeToFirstByte(setup: Setup, rttMs: number, method = 'GET'): FirstByte {
  const before = roundTripsBeforeRequest(setup, method);
  return {
    roundTripsBeforeRequest: before,
    requestLeavesMs: before * rttMs,
    firstByteMs: (before + 1) * rttMs,
  };
}
