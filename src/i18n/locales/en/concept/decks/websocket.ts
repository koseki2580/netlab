import type { Catalog } from '../../../../types';

/** The `websocket` deck's questions (en); its name is in the core chunk. */
export const websocket: Catalog = {
  'learning.concept.websocket.q1.prompt':
    'A browser polls every 5 s for messages that arrive at unpredictable moments. On average, how long does a message wait at the server before a poll picks it up?',
  'learning.concept.websocket.q1.a': 'About 2.5 s, half the polling interval',
  'learning.concept.websocket.q1.b': 'About 5 s, one full polling interval',
  'learning.concept.websocket.q1.c': 'Almost nothing: each poll fetches it at once',
  'learning.concept.websocket.q1.why':
    'A message lands at a random point between two polls and waits for the next one: from almost 0 to 5 s, 2.5 s on average (2,525 ms with the 25 ms trip back).',
  'learning.concept.websocket.q1.b.why':
    'A full interval is the worst case, for a message that lands just after a poll. On average it lands halfway.',
  'learning.concept.websocket.q1.c.why':
    'The poll fetches only what is already there; a message that arrives just after a poll waits until the next one.',
  'learning.concept.websocket.q2.prompt':
    'With a message every 10 s for a minute, short polling every 5 s costs 7,800 bytes and a WebSocket about 1,250. Where does the WebSocket save?',
  'learning.concept.websocket.q2.a': 'It compresses HTTP headers, as HTTP/2 does',
  'learning.concept.websocket.q2.b': 'Its messages skip TCP and go straight over IP',
  'learning.concept.websocket.q2.c': 'After one handshake, frames replace requests',
  'learning.concept.websocket.q2.why':
    'Short polling pays about 600 bytes of headers on each of 12 exchanges. A WebSocket pays one Upgrade handshake, then a 2-byte header per small server frame.',
  'learning.concept.websocket.q2.a.why':
    'WebSocket does not compress headers; after the handshake there are no HTTP headers left to send.',
  'learning.concept.websocket.q2.b.why':
    'A WebSocket runs over the same TCP connection as the handshake; it saves by sending small frames instead of HTTP requests.',
  'learning.concept.websocket.q3.prompt':
    'A 100-byte message goes from the server to the client, and another from the client to the server. How do their frame headers differ?',
  'learning.concept.websocket.q3.a': 'They do not; both headers are 2 bytes',
  'learning.concept.websocket.q3.b': 'The client’s has 4 more bytes: a masking key',
  'learning.concept.websocket.q3.c': 'The client’s has 8 more bytes of length field',
  'learning.concept.websocket.q3.why':
    'RFC 6455 requires every client-to-server frame to be masked with a 4-byte key: 6 bytes against the server’s 2.',
  'learning.concept.websocket.q3.a.why':
    'The length fits in 7 bits for both, but frames from the client also carry the 4-byte masking key.',
  'learning.concept.websocket.q3.c.why':
    'The 8-byte length is used only for payloads over 65,535 bytes, in either direction; 100 bytes fit in 7 bits.',
  'learning.concept.websocket.q4.prompt':
    'The connection drops before any response comes back. Which request may the client send again automatically?',
  'learning.concept.websocket.q4.a': 'POST /orders, placing an order',
  'learning.concept.websocket.q4.b': 'PATCH /points, adding 5 points',
  'learning.concept.websocket.q4.c': 'PUT /profile/name, setting it to Aiko',
  'learning.concept.websocket.q4.why':
    'PUT is idempotent (RFC 9110 §9.2.2): applied twice, the name is still Aiko. The server ends the same whether the first one arrived or not.',
  'learning.concept.websocket.q4.a.why':
    'POST is not idempotent: if the first one did arrive, a resend makes a second order.',
  'learning.concept.websocket.q4.b.why':
    'PATCH is not idempotent in general: this one applied twice adds 10 points instead of 5.',
};
