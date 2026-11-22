import type { Catalog } from '../../../../types';

/** The `http2` deck's questions (en); its name is in the core chunk. */
export const http2: Catalog = {
  'learning.concept.http2.q1.prompt': 'HTTP/2 improves on HTTP/1.1 mainly by…',
  'learning.concept.http2.q1.a': 'Multiplexing many requests over one connection',
  'learning.concept.http2.q1.b': 'Encrypting the connection with IPsec',
  'learning.concept.http2.q1.c': 'Using UDP instead of TCP underneath',
  'learning.concept.http2.q1.why':
    'HTTP/2 sends concurrent streams over a single TCP connection instead of opening many connections.',
  'learning.concept.http2.q2.prompt': 'HTTP/2 frames the protocol as…',
  'learning.concept.http2.q2.a': 'Plain text lines',
  'learning.concept.http2.q2.b': 'Binary frames',
  'learning.concept.http2.q2.c': 'Fixed 1500-byte cells',
  'learning.concept.http2.q2.why':
    'HTTP/2 replaces text with a binary framing layer carrying streams, which is more efficient to parse.',
  'learning.concept.http2.q3.prompt': 'HTTP/2 compresses headers with…',
  'learning.concept.http2.q3.a': 'gzip',
  'learning.concept.http2.q3.b': 'No compression',
  'learning.concept.http2.q3.c': 'HPACK',
  'learning.concept.http2.q3.why':
    'HPACK compresses repetitive headers with a shared dynamic table, cutting overhead per request.',
  'learning.concept.http2.q1.b.why':
    'HTTP/2 does not add IPsec; its gain is multiplexing many requests over a single TCP connection.',
  'learning.concept.http2.q1.c.why':
    'HTTP/2 still uses TCP (UDP is HTTP/3’s QUIC); it multiplexes streams over one connection.',
  'learning.concept.http2.q2.a.why':
    'Plain-text lines are HTTP/1.1; HTTP/2 uses an efficient binary framing layer.',
  'learning.concept.http2.q2.c.why':
    'Fixed 1500-byte cells evoke ATM/Ethernet MTU, not HTTP/2 — it uses variable-length binary frames.',
  'learning.concept.http2.q3.a.why':
    'gzip compresses bodies; HTTP/2 headers are compressed with the purpose-built HPACK.',
  'learning.concept.http2.q3.b.why':
    'HTTP/2 does compress headers — repetitive ones especially — using HPACK.',
};
