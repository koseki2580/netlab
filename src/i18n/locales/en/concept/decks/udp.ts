import type { Catalog } from '../../../../types';

/** The `udp` deck's questions (en); its name is in the core chunk. */
export const udp: Catalog = {
  'learning.concept.udp.q1.prompt': 'Compared to TCP, UDP…',
  'learning.concept.udp.q1.a': 'Adds retransmission of lost data',
  'learning.concept.udp.q1.b': 'Guarantees ordering of the data',
  'learning.concept.udp.q1.c': 'Has no handshake or delivery guarantee',
  'learning.concept.udp.q1.why':
    'UDP is connectionless and fire-and-forget — lower overhead, no reliability.',
  'learning.concept.udp.q2.prompt': 'UDP is a good fit for…',
  'learning.concept.udp.q2.a': 'Large file downloads',
  'learning.concept.udp.q2.b': 'Real-time voice/video and DNS',
  'learning.concept.udp.q2.c': 'Bank transactions',
  'learning.concept.udp.q2.why':
    'Latency-sensitive or simple request/response traffic prefers UDP’s low overhead over TCP’s reliability cost.',
  'learning.concept.udp.q3.prompt': 'A UDP header contains…',
  'learning.concept.udp.q3.a': 'Source/destination ports, length, checksum',
  'learning.concept.udp.q3.b': 'Sequence and acknowledgement numbers',
  'learning.concept.udp.q3.c': 'A congestion window',
  'learning.concept.udp.q3.why':
    'The UDP header is 8 bytes: source and destination ports, length and an optional checksum.',
  'learning.concept.udp.q4.prompt': 'If a UDP datagram is lost, the protocol…',
  'learning.concept.udp.q4.a': 'Does nothing — the application must handle it',
  'learning.concept.udp.q4.b': 'Retransmits it automatically after a timeout',
  'learning.concept.udp.q4.c': 'Resets the connection and starts again',
  'learning.concept.udp.q4.why':
    'UDP offers no reliability; apps that need it (or tolerate loss) build that on top.',
  'learning.concept.udp.q5.prompt': 'DNS often uses UDP because…',
  'learning.concept.udp.q5.a': 'It needs the encryption that UDP provides',
  'learning.concept.udp.q5.b': 'It only needs a small query that is easily retried',
  'learning.concept.udp.q5.c': 'It needs the strict ordering that UDP gives',
  'learning.concept.udp.q5.why':
    'A single small exchange does not justify TCP setup cost; the client just retries on loss.',
  'learning.concept.udp.q1.a.why':
    'Retransmission is TCP’s feature; UDP sends and forgets — any resend is up to the app.',
  'learning.concept.udp.q1.b.why':
    'Ordering is a TCP guarantee; UDP datagrams can arrive out of order or not at all.',
  'learning.concept.udp.q2.a.why':
    'Large downloads need every byte intact and ordered — that is TCP’s reliability, not UDP.',
  'learning.concept.udp.q2.c.why':
    'Bank transactions demand guaranteed delivery; that calls for TCP, not best-effort UDP.',
  'learning.concept.udp.q3.b.why':
    'Sequence and acknowledgement numbers are TCP; UDP carries only ports, length and checksum.',
  'learning.concept.udp.q3.c.why':
    'A congestion window is TCP machinery; UDP is connectionless and has nothing to throttle.',
  'learning.concept.udp.q4.b.why':
    'Retransmission is TCP; UDP never resends — recovery, if any, is the application’s job.',
  'learning.concept.udp.q4.c.why':
    'UDP has no connection to reset; a lost datagram is simply gone unless the app resends.',
  'learning.concept.udp.q5.a.why':
    'UDP itself adds no encryption; DNS uses it because a tiny query/response is fast and easily retried.',
  'learning.concept.udp.q5.c.why':
    'UDP guarantees no ordering at all — that is TCP; and a single small DNS exchange needs none, which is why lightweight UDP fits.',
};
