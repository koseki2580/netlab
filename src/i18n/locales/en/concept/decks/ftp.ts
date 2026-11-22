import type { Catalog } from '../../../../types';

/** The `ftp` deck's questions (en); its name is in the core chunk. */
export const ftp: Catalog = {
  'learning.concept.ftp.q1.b.why':
    'FTP is TCP-based with two connections, not a single UDP datagram; it separates control and data.',
  'learning.concept.ftp.q1.c.why':
    'ICMP is for diagnostics; FTP runs over TCP with separate control and data channels.',
  'learning.concept.ftp.q2.a.why':
    'Port 80 is HTTP; FTP’s control connection uses port 21 (data on 20 or a negotiated port).',
  'learning.concept.ftp.q2.c.why': 'Port 53 is DNS; the FTP control connection uses port 21.',
  'learning.concept.ftp.q3.a.why':
    'Passive mode does not encrypt (that is FTPS/SFTP); it lets the client open the data connection through its firewall/NAT.',
  'learning.concept.ftp.q3.b.why':
    'Passive FTP has nothing to do with DNS; it makes the data connection traverse client-side firewalls and NAT.',
  'learning.concept.ftp.q1.prompt': 'FTP uses…',
  'learning.concept.ftp.q1.a': 'Separate control and data connections',
  'learning.concept.ftp.q1.b': 'A single UDP datagram per file',
  'learning.concept.ftp.q1.c': 'ICMP messages to move the data',
  'learning.concept.ftp.q1.why':
    'FTP keeps a control channel for commands and opens separate data connections for transfers.',
  'learning.concept.ftp.q2.prompt': 'The FTP control connection uses port…',
  'learning.concept.ftp.q2.a': '80',
  'learning.concept.ftp.q2.b': '21',
  'learning.concept.ftp.q2.c': '53',
  'learning.concept.ftp.q2.why':
    'Port 21 carries FTP commands; data uses port 20 (active) or a negotiated port (passive).',
  'learning.concept.ftp.q3.prompt': 'Passive FTP was introduced to…',
  'learning.concept.ftp.q3.a': 'Encrypt the data connection',
  'learning.concept.ftp.q3.b': 'Speed up DNS lookups',
  'learning.concept.ftp.q3.c': 'Work through client-side firewalls',
  'learning.concept.ftp.q3.why':
    'In passive mode the client opens the data connection, so it traverses NAT/firewalls that block inbound active-mode connections.',
};
