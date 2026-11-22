import type { Catalog } from '../../../../types';

/** The `smtp` deck's questions (en); its name is in the core chunk. */
export const smtp: Catalog = {
  'learning.concept.smtp.q1.b.why':
    'Retrieval is IMAP/POP3’s job — a mail client speaks SMTP only for the outgoing submission hop, never to fetch mail.',
  'learning.concept.smtp.q1.c.why':
    'Hostname resolution is DNS; SMTP is the protocol for sending and relaying email.',
  'learning.concept.smtp.q2.a.why':
    'Port 110 is POP3 (retrieval); SMTP uses 25 (server relay) or 587 (submission).',
  'learning.concept.smtp.q2.c.why': 'Port 22 is SSH; SMTP uses 25 or 587.',
  'learning.concept.smtp.q3.a.why':
    'An A record gives a host’s IPv4; mail delivery is directed by the MX record.',
  'learning.concept.smtp.q3.b.why':
    'A CNAME is an alias; the record that names a domain’s mail servers is MX.',
  'learning.concept.smtp.q1.prompt': 'SMTP is used to…',
  'learning.concept.smtp.q1.a': 'Send and relay email between servers',
  'learning.concept.smtp.q1.b': 'Retrieve email to a client',
  'learning.concept.smtp.q1.c': 'Resolve hostnames',
  'learning.concept.smtp.q1.why':
    'SMTP pushes mail from client to server and server to server; retrieval is IMAP/POP3.',
  'learning.concept.smtp.q2.prompt': 'SMTP commonly uses port…',
  'learning.concept.smtp.q2.a': '110',
  'learning.concept.smtp.q2.b': '25',
  'learning.concept.smtp.q2.c': '22',
  'learning.concept.smtp.q2.why':
    'Port 25 is server-to-server SMTP; 587 is authenticated client submission; 110 is POP3.',
  'learning.concept.smtp.q3.prompt': 'Which DNS record says where to deliver a domain’s mail?',
  'learning.concept.smtp.q3.a': 'A',
  'learning.concept.smtp.q3.b': 'CNAME',
  'learning.concept.smtp.q3.c': 'MX',
  'learning.concept.smtp.q3.why': 'The MX record names the mail exchanger host for a domain.',
};
