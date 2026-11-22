import type { Catalog } from '../../../../types';

/** The `quic` deck's questions (en); its name is in the core chunk. */
export const quic: Catalog = {
  'learning.concept.quic.q1.prompt': 'QUIC runs on top of…',
  'learning.concept.quic.q1.a': 'UDP',
  'learning.concept.quic.q1.b': 'TCP',
  'learning.concept.quic.q1.c': 'ICMP',
  'learning.concept.quic.q1.why':
    'QUIC builds reliability, ordering, and encryption itself, on UDP, to avoid TCP’s head-of-line blocking and handshake latency.',
  'learning.concept.quic.q2.prompt': 'A key QUIC advantage over TCP+TLS is…',
  'learning.concept.quic.q2.a': 'No encryption, so less overhead',
  'learning.concept.quic.q2.b': 'Faster connection setup (often 1-RTT or 0-RTT)',
  'learning.concept.quic.q2.c': 'Lower throughput but steadier',
  'learning.concept.quic.q2.why':
    'QUIC folds the transport and TLS handshakes together, cutting round trips before data flows.',
  'learning.concept.quic.q3.prompt': 'QUIC carries multiple streams so that…',
  'learning.concept.quic.q3.a': 'Only one request fits per connection',
  'learning.concept.quic.q3.b': 'Packets are never lost',
  'learning.concept.quic.q3.c': 'One lost packet doesn’t stall the other streams',
  'learning.concept.quic.q3.why':
    'Independent streams avoid TCP’s head-of-line blocking, where one loss delays everything.',
  'learning.concept.quic.q1.b.why':
    'QUIC deliberately avoids TCP to escape its head-of-line blocking; it runs over UDP.',
  'learning.concept.quic.q1.c.why':
    'ICMP is for diagnostics, not data transport; QUIC is built on UDP.',
  'learning.concept.quic.q2.a.why':
    'QUIC is always encrypted (TLS 1.3 is built in); its edge is faster setup, not skipping encryption.',
  'learning.concept.quic.q2.c.why':
    'QUIC aims for equal-or-better throughput; its headline win is faster connection setup (1-RTT/0-RTT).',
  'learning.concept.quic.q3.a.why':
    'It is the opposite — independent streams let many requests share one connection concurrently.',
  'learning.concept.quic.q3.b.why':
    'QUIC cannot prevent packet loss; it limits the damage so a loss stalls only its own stream.',
};
