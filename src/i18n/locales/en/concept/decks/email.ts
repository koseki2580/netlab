import type { Catalog } from '../../../../types';

/** The `email` deck's questions (en); its name is in the core chunk. */
export const email: Catalog = {
  'learning.concept.email.q1.b.why':
    'Sending/relaying between servers is SMTP; IMAP and POP3 retrieve mail to a client.',
  'learning.concept.email.q1.c.why':
    'Address assignment is DHCP; IMAP/POP3 fetch mail from the mailbox server.',
  'learning.concept.email.q2.a.why':
    'Both can run over TLS; the real difference is IMAP syncs server-side while POP3 downloads and removes.',
  'learning.concept.email.q2.c.why':
    'POP3 retrieves, it does not send (that is SMTP); IMAP keeps mail synced on the server, POP3 downloads it.',
  'learning.concept.email.q3.a.why':
    'ICMP is for diagnostics, not mail; secure IMAP/POP3 are wrapped in TLS.',
  'learning.concept.email.q3.b.why':
    'ARP resolves IP→MAC on the LAN; mail retrieval is secured with TLS.',
  'learning.concept.email.q1.prompt': 'IMAP and POP3 are used to…',
  'learning.concept.email.q1.a': 'Retrieve email from a mailbox server',
  'learning.concept.email.q1.b': 'Send email between mail servers',
  'learning.concept.email.q1.c': 'Assign IP addresses to hosts',
  'learning.concept.email.q1.why': 'They pull mail down to the client; SMTP is what sends it.',
  'learning.concept.email.q2.prompt': 'A key IMAP vs POP3 difference is…',
  'learning.concept.email.q2.a': 'IMAP can only run unencrypted',
  'learning.concept.email.q2.b': 'IMAP keeps mail on the server; POP3 removes it',
  'learning.concept.email.q2.c': 'POP3 is the protocol that sends mail',
  'learning.concept.email.q2.why':
    'IMAP is server-side and multi-device; POP3 historically downloads to a single device.',
  'learning.concept.email.q3.prompt': 'Secure IMAP/POP3 runs over…',
  'learning.concept.email.q3.a': 'ICMP',
  'learning.concept.email.q3.b': 'ARP',
  'learning.concept.email.q3.c': 'TLS',
  'learning.concept.email.q3.why': 'IMAPS/POP3S wrap the session in TLS for confidentiality.',
};
