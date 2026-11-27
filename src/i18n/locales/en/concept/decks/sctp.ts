import type { Catalog } from '../../../../types';

/** The `sctp` deck's questions (en); its name is in the core chunk. */
export const sctp: Catalog = {
  'learning.concept.sctp.q1.prompt':
    'An SCTP association has a primary and a secondary path; the primary fails. The RTO starts at 1 s and doubles at each timeout, up to 60 s, and the primary is abandoned when its error count exceeds Path.Max.Retrans = 5. When does new data move to the secondary?',
  'learning.concept.sctp.q1.a': 'After 5 s: five timeouts of 1 s',
  'learning.concept.sctp.q1.b': 'After 31 s: five doubling timeouts',
  'learning.concept.sctp.q1.c': 'After 63 s: six doubling timeouts',
  'learning.concept.sctp.q1.why':
    '“Exceeds 5” is the sixth timeout, and each waits twice as long as the last: 1 + 2 + 4 + 8 + 16 + 32 = 63 s.',
  'learning.concept.sctp.q1.a.why':
    'The RTO is not fixed: it doubles after each timeout, so the waits grow 1, 2, 4, 8 … seconds.',
  'learning.concept.sctp.q1.b.why':
    'Five timeouts make the error count 5, which only equals Path.Max.Retrans; the path is abandoned when the count exceeds it, at the sixth.',
  'learning.concept.sctp.q2.prompt':
    'One association carries two ordered streams. Messages A1 (stream 1), B1 (stream 2), A2, B2, A3, B3 are sent in that order and A1 is lost. Which messages reach the application late?',
  'learning.concept.sctp.q2.a': 'A1, A2 and A3: only stream 1',
  'learning.concept.sctp.q2.b': 'All six, until A1 is retransmitted',
  'learning.concept.sctp.q2.c': 'Only A1 itself',
  'learning.concept.sctp.q2.why':
    'Order is kept only within a stream, so A2 and A3 wait for A1 while B1, B2 and B3 are handed over as they arrive.',
  'learning.concept.sctp.q2.b.why':
    'That is one TCP connection, where every byte is in one order. SCTP orders each stream separately.',
  'learning.concept.sctp.q2.c.why':
    'Stream 1 is ordered, so A2 and A3 cannot be handed over before A1, even if they have already arrived.',
  'learning.concept.sctp.q3.prompt':
    'Same failure with RTO starting at 1 s and doubling, but the operator set Path.Max.Retrans = 2. When does new data move to the secondary?',
  'learning.concept.sctp.q3.a': 'After 2 s: two timeouts of 1 s',
  'learning.concept.sctp.q3.b': 'After 7 s: 1 + 2 + 4 s',
  'learning.concept.sctp.q3.c': 'After 3 s: 1 + 2 s',
  'learning.concept.sctp.q3.why':
    'The count must exceed 2, so the third timeout ends it: 1 + 2 + 4 = 7 s instead of 63 s with the default 5.',
  'learning.concept.sctp.q3.a.why':
    'The RTO doubles after each timeout, and the path is abandoned only when the count exceeds 2, at the third timeout.',
  'learning.concept.sctp.q3.c.why':
    'Two timeouts make the count 2, which equals Path.Max.Retrans; it has to exceed it, so a third timeout of 4 s comes first.',
  'learning.concept.sctp.q4.prompt':
    'The same six messages go over one TCP connection instead, and A1 is lost. How many of them reach the application late?',
  'learning.concept.sctp.q4.a': 'One: only A1',
  'learning.concept.sctp.q4.b': 'Three: A1, A2 and A3',
  'learning.concept.sctp.q4.c': 'All six messages',
  'learning.concept.sctp.q4.why':
    'TCP delivers one ordered byte stream, so everything after the lost bytes waits for the retransmission: head-of-line blocking.',
  'learning.concept.sctp.q4.a.why':
    'TCP cannot hand over later bytes before the missing ones, so the messages after A1 wait too.',
  'learning.concept.sctp.q4.b.why':
    'TCP knows nothing of the application’s streams; B1, B2 and B3 sit behind A1 in the one byte stream.',
};
