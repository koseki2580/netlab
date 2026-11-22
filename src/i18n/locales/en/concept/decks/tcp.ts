import type { Catalog } from '../../../../types';

/** The `tcp` deck's questions (en); its name is in the core chunk. */
export const tcp: Catalog = {
  'learning.concept.tcp.q1.prompt': 'The TCP three-way handshake order is…',
  'learning.concept.tcp.q1.a': 'SYN, SYN-ACK, ACK',
  'learning.concept.tcp.q1.b': 'ACK, SYN, FIN',
  'learning.concept.tcp.q1.c': 'SYN, ACK, SYN',
  'learning.concept.tcp.q1.why':
    'The client SYNs, the server SYN-ACKs, the client ACKs — then the connection is established.',
  'learning.concept.tcp.q2.prompt': 'TCP guarantees…',
  'learning.concept.tcp.q2.a': 'The lowest possible latency',
  'learning.concept.tcp.q2.b': 'Reliable, in-order delivery',
  'learning.concept.tcp.q2.c': 'Encryption of the payload',
  'learning.concept.tcp.q2.why':
    'Sequence numbers, acknowledgements and retransmission give reliable ordered bytes; encryption is TLS’s job.',
  'learning.concept.tcp.q3.prompt': 'What closes a TCP connection gracefully?',
  'learning.concept.tcp.q3.a': 'An RST segment',
  'learning.concept.tcp.q3.b': 'A second SYN',
  'learning.concept.tcp.q3.c': 'A FIN exchange',
  'learning.concept.tcp.q3.why':
    'Each side sends FIN and ACKs the other’s FIN; RST is an abrupt abort, not a graceful close.',
  'learning.concept.tcp.q4.prompt': 'When a TCP segment is lost, TCP…',
  'learning.concept.tcp.q4.a': 'Retransmits it',
  'learning.concept.tcp.q4.b': 'Ignores it',
  'learning.concept.tcp.q4.c': 'Closes the connection',
  'learning.concept.tcp.q4.why':
    'Missing acknowledgements trigger retransmission — how TCP delivers reliably over an unreliable network.',
  'learning.concept.tcp.q5.prompt': 'TCP flow and congestion control exist to…',
  'learning.concept.tcp.q5.a': 'Encrypt the data so that only the receiver can read it',
  'learning.concept.tcp.q5.b': 'Avoid overwhelming the receiver and the network',
  'learning.concept.tcp.q5.c': 'Assign IP addresses to both endpoints',
  'learning.concept.tcp.q5.why':
    'Windows adapt the send rate to the receiver buffer and to congestion signals from the network.',
  'learning.concept.tcp.q1.b.why':
    'FIN tears a connection DOWN; opening one is SYN → SYN-ACK → ACK.',
  'learning.concept.tcp.q1.c.why':
    'The middle step is a combined SYN-ACK and the ACK comes last: SYN → SYN-ACK → ACK.',
  'learning.concept.tcp.q2.a.why':
    'TCP trades a little latency for reliability (retransmits, ordering); UDP is the low-latency choice.',
  'learning.concept.tcp.q2.c.why':
    'TCP does not encrypt — that is TLS layered on top; TCP guarantees reliable, in-order bytes.',
  'learning.concept.tcp.q3.a.why':
    'An RST is for error cases — a refused port or a broken connection — killing the session instantly with no FIN exchange.',
  'learning.concept.tcp.q3.b.why':
    'A second SYN tries to OPEN, not close; graceful teardown is a FIN/ACK in each direction.',
  'learning.concept.tcp.q4.b.why':
    'TCP never just ignores loss — that would break reliability; it retransmits the missing segment.',
  'learning.concept.tcp.q4.c.why':
    'A single loss triggers retransmission, not a close; TCP only tears down on real failure.',
  'learning.concept.tcp.q5.a.why':
    'Encryption is TLS’s job; flow and congestion control pace the sender to match receiver and network.',
  'learning.concept.tcp.q5.c.why':
    'Assigning IP addresses is DHCP; TCP’s windows throttle the send rate to avoid overload.',
};
