import type { Catalog } from '../../../../types';

/** The `tls` deck's questions (en); its name is in the core chunk. */
export const tls: Catalog = {
  'learning.concept.tls.q1.prompt': 'TLS provides…',
  'learning.concept.tls.q1.a': 'Routing packets between different networks',
  'learning.concept.tls.q1.b': 'Encryption, integrity and server authentication',
  'learning.concept.tls.q1.c': 'IP address assignment for clients',
  'learning.concept.tls.q1.why':
    'TLS secures a transport connection: it encrypts data, detects tampering, and authenticates the server via its certificate.',
  'learning.concept.tls.q2.prompt': 'During the handshake the server proves its identity with…',
  'learning.concept.tls.q2.a': 'A MAC address it presents',
  'learning.concept.tls.q2.b': 'A VLAN tag on the session',
  'learning.concept.tls.q2.c': 'An X.509 certificate',
  'learning.concept.tls.q2.why':
    'The certificate, signed by a CA the client trusts, binds the server’s name to its public key.',
  'learning.concept.tls.q3.prompt': 'TLS runs…',
  'learning.concept.tls.q3.a': 'Over a reliable transport like TCP',
  'learning.concept.tls.q3.b': 'Below IP, under the network layer',
  'learning.concept.tls.q3.c': 'Instead of Ethernet at layer 2',
  'learning.concept.tls.q3.why':
    'TLS assumes an ordered, reliable byte stream, so it sits on top of TCP (QUIC provides its own).',
  'learning.concept.tls.q1.a.why':
    'Routing moves packets between networks; TLS secures a session end to end with encryption, integrity, and server authentication.',
  'learning.concept.tls.q1.c.why':
    'Address assignment is DHCP; TLS secures a session with encryption, integrity and authentication.',
  'learning.concept.tls.q2.a.why':
    'A MAC is just an L2 hardware address, easily spoofed; TLS identity is proven with an X.509 certificate.',
  'learning.concept.tls.q2.b.why':
    'A VLAN tag segments L2 traffic; it says nothing about identity — TLS uses an X.509 certificate.',
  'learning.concept.tls.q3.b.why':
    'TLS sits above the transport, not below IP; it needs a reliable byte stream like TCP underneath.',
  'learning.concept.tls.q3.c.why':
    'TLS does not replace Ethernet (L2); it layers on top of a reliable transport such as TCP.',
};
