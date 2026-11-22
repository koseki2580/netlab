import type { Catalog } from '../../../../types';

/** The `http3` deck's questions (en); its name is in the core chunk. */
export const http3: Catalog = {
  'learning.concept.http3.q1.prompt': 'HTTP/3 runs over…',
  'learning.concept.http3.q1.a': 'QUIC (UDP)',
  'learning.concept.http3.q1.b': 'Raw TCP alone',
  'learning.concept.http3.q1.c': 'ICMP alone',
  'learning.concept.http3.q1.why':
    'HTTP/3 maps HTTP semantics onto QUIC, which provides streams, reliability, and TLS over UDP.',
  'learning.concept.http3.q2.prompt': 'A key HTTP/3 win over HTTP/2 is…',
  'learning.concept.http3.q2.a': 'Bigger headers for more metadata',
  'learning.concept.http3.q2.b': 'No TCP head-of-line blocking across streams',
  'learning.concept.http3.q2.c': 'No encryption, so it is faster',
  'learning.concept.http3.q2.why':
    'Because QUIC streams are independent, one lost packet does not stall the others as it would on TCP.',
  'learning.concept.http3.q3.prompt': 'HTTP/3 compresses headers with…',
  'learning.concept.http3.q3.a': 'HPACK',
  'learning.concept.http3.q3.b': 'gzip',
  'learning.concept.http3.q3.c': 'QPACK',
  'learning.concept.http3.q3.why':
    'QPACK is HPACK adapted for QUIC, avoiding head-of-line blocking on the header table updates.',
  'learning.concept.http3.q1.b.why':
    'Raw TCP is HTTP/1.1 and HTTP/2; HTTP/3 runs over QUIC, which is built on UDP.',
  'learning.concept.http3.q1.c.why': 'ICMP is for diagnostics; HTTP/3 runs over QUIC (UDP).',
  'learning.concept.http3.q2.a.why':
    'HTTP/3 keeps headers compact (QPACK); its win is removing TCP’s cross-stream head-of-line blocking.',
  'learning.concept.http3.q2.c.why':
    'HTTP/3 is always encrypted via QUIC/TLS 1.3; the gain is no TCP head-of-line blocking across streams.',
  'learning.concept.http3.q3.a.why':
    'HPACK is HTTP/2’s; HTTP/3 needs QPACK, which tolerates QUIC’s out-of-order stream delivery.',
  'learning.concept.http3.q3.b.why':
    'gzip is for bodies; HTTP/3 compresses headers with QPACK (HPACK adapted for QUIC).',
};
