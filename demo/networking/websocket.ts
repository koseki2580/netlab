/**
 * The real-time web lesson (REQ-439): a server has an event every N seconds
 * for one minute. How many requests, how many bytes and how much delay do
 * short polling, long polling and a WebSocket (RFC 6455) cost? And which
 * requests may a client resend automatically when the connection drops
 * (idempotent methods, RFC 9110 §9.2.2)?
 *
 * Short polling: the client asks every P seconds; an event waits on average
 * P/2 for the next request, then one one-way delay for the response.
 * Long polling: the request waits at the server until an event (or until the
 * server's hold time, an application setting) and the client asks again at
 * once. WebSocket: one HTTP/1.1 Upgrade handshake, then each event is one
 * frame: 2 header bytes, +2 for 126..65,535 payload bytes, +8 above that,
 * and +4 for the masking key on client-to-server frames.
 *
 * Simplified: bytes are HTTP and WebSocket bytes only (no TCP, IP or TLS),
 * all requests reuse one persistent connection, the header sizes below are
 * assumptions for a small cookie-less request, events are N seconds apart
 * from N to 60 s, and WebSocket keep-alive pings (chosen by the application)
 * are not counted.
 */

export const WINDOW_S = 60;
/** Assumed size of an ordinary request's line and headers, bytes. */
export const REQUEST_HEADER_BYTES = 400;
/** Assumed size of an ordinary response's status line and headers, bytes. */
export const RESPONSE_HEADER_BYTES = 200;
export const PAYLOAD_BYTES = 100;
export const ONE_WAY_MS = 25;
/** How long the server holds a long-poll request before answering empty: an application setting. */
export const LONG_POLL_HOLD_S = 30;

/** The header lines a WebSocket Upgrade request adds (RFC 6455 §1.3, its sample key). */
export const UPGRADE_LINES =
  'Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n';
/** The server's whole 101 response (RFC 6455 §1.3, the accept value for that key). */
export const SWITCHING_RESPONSE =
  'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\r\n\r\n';

/** RFC 6455 §5.2: the bytes before a frame's payload. */
export function frameHeaderBytes(payloadBytes: number, fromClient: boolean): number {
  const length = payloadBytes <= 125 ? 0 : payloadBytes <= 65_535 ? 2 : 8;
  return 2 + length + (fromClient ? 4 : 0);
}

export type Method = 'short' | 'long' | 'websocket';
export const METHODS: readonly Method[] = ['short', 'long', 'websocket'];

export interface Cost {
  readonly events: number;
  /** HTTP requests sent in the minute (for WebSocket, the handshake). */
  readonly requests: number;
  readonly bytes: number;
  /** Average time from an event at the server to its arrival at the client, ms. */
  readonly averageDelayMs: number;
}

export function eventsIn(everyS: number): number {
  return Math.floor(WINDOW_S / everyS);
}

/** One minute of events every `everyS` seconds, delivered by `method` (short polling every `pollS`). */
export function cost(method: Method, everyS: number, pollS: number): Cost {
  const events = eventsIn(everyS);
  const exchange = REQUEST_HEADER_BYTES + RESPONSE_HEADER_BYTES;
  const payloads = events * PAYLOAD_BYTES;
  if (method === 'short') {
    const requests = Math.floor(WINDOW_S / pollS);
    return {
      events,
      requests,
      bytes: requests * exchange + payloads,
      averageDelayMs: (pollS * 1000) / 2 + ONE_WAY_MS,
    };
  }
  if (method === 'long') {
    // Each gap between events needs one request, plus one more per hold time that runs out.
    const requests = events * Math.ceil(everyS / LONG_POLL_HOLD_S);
    return { events, requests, bytes: requests * exchange + payloads, averageDelayMs: ONE_WAY_MS };
  }
  const handshake = REQUEST_HEADER_BYTES + UPGRADE_LINES.length + SWITCHING_RESPONSE.length;
  return {
    events,
    requests: 1,
    bytes: handshake + events * (frameHeaderBytes(PAYLOAD_BYTES, false) + PAYLOAD_BYTES),
    averageDelayMs: ONE_WAY_MS,
  };
}

/** RFC 9110 §9.2.2: the idempotent methods. */
export const IDEMPOTENT_METHODS: readonly string[] = [
  'GET',
  'HEAD',
  'OPTIONS',
  'TRACE',
  'PUT',
  'DELETE',
];

export function isIdempotent(method: string): boolean {
  return IDEMPOTENT_METHODS.includes(method);
}

export interface ShopState {
  readonly name: string;
  readonly cart: readonly number[];
  readonly orders: number;
  readonly points: number;
}

export const START: ShopState = { name: 'Ken', cart: [3, 7], orders: 0, points: 10 };

export interface ShopRequest {
  readonly id: 'get-feed' | 'put-name' | 'delete-item' | 'post-order' | 'patch-points';
  readonly method: string;
  readonly target: string;
  readonly body?: string;
  readonly apply: (state: ShopState) => ShopState;
}

export const REQUESTS: readonly ShopRequest[] = [
  { id: 'get-feed', method: 'GET', target: '/feed', apply: (s) => s },
  {
    id: 'put-name',
    method: 'PUT',
    target: '/profile/name',
    body: '"Aiko"',
    apply: (s) => ({ ...s, name: 'Aiko' }),
  },
  {
    id: 'delete-item',
    method: 'DELETE',
    target: '/cart/items/7',
    apply: (s) => ({ ...s, cart: s.cart.filter((item) => item !== 7) }),
  },
  {
    id: 'post-order',
    method: 'POST',
    target: '/orders',
    apply: (s) => ({ ...s, orders: s.orders + 1 }),
  },
  {
    id: 'patch-points',
    method: 'PATCH',
    target: '/points',
    body: '{"add": 5}',
    apply: (s) => ({ ...s, points: s.points + 5 }),
  },
];

export interface Retry {
  readonly once: ShopState;
  readonly twice: ShopState;
  /** The server ends in the same state whether the request arrived once or twice. */
  readonly sameAfterRetry: boolean;
}

/** What the server holds if the request arrived once, and if a retry made it arrive twice. */
export function retry(request: ShopRequest): Retry {
  const once = request.apply(START);
  const twice = request.apply(once);
  return { once, twice, sameAfterRetry: JSON.stringify(once) === JSON.stringify(twice) };
}
