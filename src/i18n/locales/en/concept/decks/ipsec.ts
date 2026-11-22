import type { Catalog } from '../../../../types';

/** The `ipsec` deck's questions (en); its name is in the core chunk. */
export const ipsec: Catalog = {
  'learning.concept.ipsec.q1.b.why':
    'Name resolution is DNS; IPsec authenticates and encrypts IP packets to build a secure VPN.',
  'learning.concept.ipsec.q1.c.why':
    'Switching is L2 frame forwarding; IPsec secures IP packets end-to-end with authentication and encryption.',
  'learning.concept.ipsec.q2.a.why':
    'AH authenticates and checks integrity but does not encrypt; ESP is the one that encrypts the payload.',
  'learning.concept.ipsec.q2.c.why':
    'ARP resolves IP→MAC and is unrelated to IPsec; ESP provides the encryption.',
  'learning.concept.ipsec.q3.a.why':
    'IPsec does not encrypt ports selectively; tunnel mode wraps and encrypts the entire original packet.',
  'learning.concept.ipsec.q3.b.why':
    'Tunnel mode does not disable routing — it adds a new IP header so encrypted packets route between gateways.',
  'learning.concept.ipsec.q1.prompt': 'IPsec provides…',
  'learning.concept.ipsec.q1.a': 'Authenticated, encrypted IP packets',
  'learning.concept.ipsec.q1.b': 'Name resolution for hosts',
  'learning.concept.ipsec.q1.c': 'Switching frames between ports',
  'learning.concept.ipsec.q1.why':
    'IPsec secures IP traffic itself — confidentiality, integrity, authentication — commonly for VPNs.',
  'learning.concept.ipsec.q2.prompt': 'Which IPsec protocol encrypts the payload?',
  'learning.concept.ipsec.q2.a': 'AH',
  'learning.concept.ipsec.q2.b': 'ESP',
  'learning.concept.ipsec.q2.c': 'ARP',
  'learning.concept.ipsec.q2.why':
    'ESP (Encapsulating Security Payload) encrypts and authenticates; AH only authenticates.',
  'learning.concept.ipsec.q3.prompt': 'IPsec tunnel mode…',
  'learning.concept.ipsec.q3.a': 'Encrypts only the port numbers in the header',
  'learning.concept.ipsec.q3.b': 'Disables routing between the two gateways',
  'learning.concept.ipsec.q3.c': 'Encrypts the whole original packet inside a new one',
  'learning.concept.ipsec.q3.why':
    'Tunnel mode wraps the entire packet (VPN gateways); transport mode protects the payload host-to-host.',
};
