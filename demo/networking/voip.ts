/**
 * The voice-over-IP lesson (REQ-407): SIP sets up the call (RFC 3261), SDP
 * offer/answer picks the codec and the RTP ports (RFC 3264), RTP carries the
 * voice (RFC 3550), and a jitter buffer trades delay for loss.
 *
 * Simplified: the two phones talk directly (no proxy, no registrar, no NAT);
 * the answer keeps the offered codecs the callee supports, in the offer's
 * order, and the first of them is used; headers are IPv4 20 + UDP 8 + RTP 12
 * bytes with no RTP extensions or SRTP tag; Opus runs at a constant
 * 32 kbit/s here (it is variable in practice); the network delay is 40 ms
 * plus a fixed list of jitter values; mouth-to-ear delay counts only
 * packetisation, the network and the buffer (no codec look-ahead or DSP).
 */
export type Codec = 'opus' | 'pcmu' | 'g722';

export interface CodecInfo {
  readonly id: Codec;
  /** The RTP payload type used in SDP. */
  readonly payloadType: number;
  /** The `a=rtpmap` value. */
  readonly rtpmap: string;
  /** Bits of voice per second, before any header. */
  readonly bitrateBps: number;
}

export const CODECS: Readonly<Record<Codec, CodecInfo>> = {
  // A dynamic payload type; RFC 7587 fixes the rtpmap to opus/48000/2.
  opus: { id: 'opus', payloadType: 111, rtpmap: 'opus/48000/2', bitrateBps: 32_000 },
  // G.711 µ-law: static payload type 0.
  pcmu: { id: 'pcmu', payloadType: 0, rtpmap: 'PCMU/8000', bitrateBps: 64_000 },
  // G.722: static payload type 9 (its rtpmap says 8000 for historical reasons).
  g722: { id: 'g722', payloadType: 9, rtpmap: 'G722/8000', bitrateBps: 64_000 },
};

export interface Endpoint {
  readonly address: string;
  readonly port: number;
}

export const CALLER: Endpoint = { address: '192.0.2.10', port: 49170 };
export const CALLEE: Endpoint = { address: '198.51.100.20', port: 52000 };
export const OFFERED: readonly Codec[] = ['opus', 'pcmu'];

export type CalleeId = 'both' | 'pcmu-only' | 'g722-only';
export const CALLEES: Readonly<Record<CalleeId, readonly Codec[]>> = {
  both: ['opus', 'pcmu'],
  'pcmu-only': ['pcmu'],
  'g722-only': ['g722'],
};
export const CALLEE_IDS = Object.keys(CALLEES) as CalleeId[];

export interface Negotiation {
  /** The codecs in the answer, in the offer's order. */
  readonly answered: readonly Codec[];
  /** The codec both sides send, or null when nothing matches. */
  readonly chosen: Codec | null;
  /** 200 when the call is answered, 488 Not Acceptable Here when no codec matches. */
  readonly status: 200 | 488;
}

export function negotiate(offered: readonly Codec[], supported: readonly Codec[]): Negotiation {
  const answered = offered.filter((codec) => supported.includes(codec));
  const chosen = answered[0] ?? null;
  return { answered, chosen, status: chosen ? 200 : 488 };
}

/** A minimal SDP body for one audio stream. */
export function sdp(endpoint: Endpoint, codecs: readonly Codec[]): string[] {
  return [
    'v=0',
    `o=- 1 1 IN IP4 ${endpoint.address}`,
    's=-',
    `c=IN IP4 ${endpoint.address}`,
    't=0 0',
    `m=audio ${endpoint.port} RTP/AVP ${codecs.map((c) => CODECS[c].payloadType).join(' ')}`,
    ...codecs.map((c) => `a=rtpmap:${CODECS[c].payloadType} ${CODECS[c].rtpmap}`),
  ];
}

export interface SipMessage {
  readonly from: 'caller' | 'callee';
  readonly label: string;
  readonly body: 'offer' | 'answer' | null;
}

export interface CallSetup extends Negotiation {
  readonly ladder: readonly SipMessage[];
  readonly offerSdp: readonly string[];
  readonly answerSdp: readonly string[] | null;
  /** Where each side sends its RTP, or null when the call failed. */
  readonly rtp: { readonly callerSendsTo: string; readonly calleeSendsTo: string } | null;
}

export function callSetup(callee: CalleeId): CallSetup {
  const result = negotiate(OFFERED, CALLEES[callee]);
  const invite: SipMessage = { from: 'caller', label: 'INVITE', body: 'offer' };
  const trying: SipMessage = { from: 'callee', label: '100 Trying', body: null };
  const ack: SipMessage = { from: 'caller', label: 'ACK', body: null };
  const ladder: SipMessage[] =
    result.status === 200
      ? [
          invite,
          trying,
          { from: 'callee', label: '180 Ringing', body: null },
          { from: 'callee', label: '200 OK', body: 'answer' },
          ack,
        ]
      : [invite, trying, { from: 'callee', label: '488 Not Acceptable Here', body: null }, ack];
  return {
    ...result,
    ladder,
    offerSdp: sdp(CALLER, OFFERED),
    answerSdp: result.status === 200 ? sdp(CALLEE, result.answered) : null,
    rtp:
      result.status === 200
        ? {
            callerSendsTo: `${CALLEE.address}:${CALLEE.port}`,
            calleeSendsTo: `${CALLER.address}:${CALLER.port}`,
          }
        : null,
  };
}

/** IPv4 20 + UDP 8 + RTP 12 bytes on every packet. */
export const HEADER_BYTES = 20 + 8 + 12;
/** Ethernet header 14 + FCS 4 bytes (no preamble or inter-frame gap). */
export const ETHERNET_BYTES = 14 + 4;
export const PACKET_TIMES_MS = [10, 20, 40] as const;

export interface Bandwidth {
  readonly payloadBytes: number;
  readonly packetsPerSecond: number;
  readonly ipBytes: number;
  /** kbit/s at the IP layer, one direction. */
  readonly ipKbps: number;
  /** kbit/s with the Ethernet header and FCS, one direction. */
  readonly ethernetKbps: number;
}

export function bandwidth(codec: Codec, packetMs: number): Bandwidth {
  const payloadBytes = (CODECS[codec].bitrateBps * packetMs) / 8000;
  const packetsPerSecond = 1000 / packetMs;
  const ipBytes = payloadBytes + HEADER_BYTES;
  return {
    payloadBytes,
    packetsPerSecond,
    ipBytes,
    ipKbps: (ipBytes * 8 * packetsPerSecond) / 1000,
    ethernetKbps: ((ipBytes + ETHERNET_BYTES) * 8 * packetsPerSecond) / 1000,
  };
}

export const SEND_INTERVAL_MS = 20;
export const BASE_DELAY_MS = 40;
/** The extra delay, beyond BASE_DELAY_MS, each of the 50 packets meets on the way. */
export const JITTER_MS: readonly number[] = [
  0, 5, 12, 3, 18, 25, 8, 2, 14, 33, 6, 10, 0, 22, 47, 15, 4, 9, 28, 11, 1, 7, 16, 52, 19, 3, 13,
  24, 6, 0, 17, 38, 8, 12, 5, 21, 2, 15, 9, 44, 10, 4, 27, 14, 7, 0, 18, 11, 3, 6,
];
export const BUFFER_CHOICES_MS = [20, 40, 60, 80] as const;
export const LOSS_TARGET_PCT = 1;
/** ITU-T G.114: up to about 150 ms one way is fine for most calls. */
export const G114_MS = 150;

/** When packet `i` arrives, ms after packet 0 was sent. */
export function arrivalMs(i: number): number {
  return i * SEND_INTERVAL_MS + BASE_DELAY_MS + JITTER_MS[i]!;
}

export interface Playout {
  readonly bufferMs: number;
  /** Indexes of the packets that arrive after their playout time. */
  readonly late: readonly number[];
  readonly lossPct: number;
  /** Packetisation + network delay of packet 0 + buffer. */
  readonly mouthToEarMs: number;
}

/**
 * Playout starts `bufferMs` after packet 0 arrives and then plays one packet
 * every SEND_INTERVAL_MS; a packet that is not there in time is lost.
 */
export function jitterBuffer(bufferMs: number): Playout {
  const start = arrivalMs(0) + bufferMs;
  const late = JITTER_MS.map((_, i) => i).filter(
    (i) => arrivalMs(i) > start + i * SEND_INTERVAL_MS,
  );
  return {
    bufferMs,
    late,
    lossPct: Math.round((late.length / JITTER_MS.length) * 1000) / 10,
    mouthToEarMs: SEND_INTERVAL_MS + arrivalMs(0) + bufferMs,
  };
}

/** The smallest of `choices` whose loss is under LOSS_TARGET_PCT, or null. */
export function bestBuffer(choices: readonly number[]): number | null {
  return (
    [...choices].sort((a, b) => a - b).find((d) => jitterBuffer(d).lossPct < LOSS_TARGET_PCT) ??
    null
  );
}

/** The smallest buffer that loses nothing. */
export function lossFreeBufferMs(): number {
  return Math.max(...JITTER_MS) - JITTER_MS[0]!;
}
