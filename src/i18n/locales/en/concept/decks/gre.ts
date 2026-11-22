import type { Catalog } from '../../../../types';

/** The `gre` deck's questions (en); its name is in the core chunk. */
export const gre: Catalog = {
  'learning.concept.gre.q1.prompt': 'A GRE tunnel works by…',
  'learning.concept.gre.q1.a': 'Encapsulating a packet inside another IP packet',
  'learning.concept.gre.q1.b': 'Encrypting the whole packet with AES',
  'learning.concept.gre.q1.c': 'Switching the MAC addresses at each hop',
  'learning.concept.gre.q1.why':
    'GRE wraps the original packet in a new IP+GRE header so it can traverse an intervening network as payload.',
  'learning.concept.gre.q2.prompt': 'By itself, GRE provides…',
  'learning.concept.gre.q2.a': 'Strong encryption of the payload',
  'learning.concept.gre.q2.b': 'Encapsulation but no encryption',
  'learning.concept.gre.q2.c': 'Address assignment for the tunnel',
  'learning.concept.gre.q2.why':
    'GRE is a tunneling/encapsulation protocol; to secure it you pair it with IPsec.',
  'learning.concept.gre.q3.prompt': 'A tunnel makes two remote networks look…',
  'learning.concept.gre.q3.a': 'Like a single host on one link',
  'learning.concept.gre.q3.b': 'Unreachable from each other',
  'learning.concept.gre.q3.c': 'Directly connected over the underlay',
  'learning.concept.gre.q3.why':
    'The endpoints behave like neighbors on a point-to-point link even though many hops separate them.',
  'learning.concept.gre.q1.b.why':
    'GRE does not encrypt (pair it with IPsec for that); it wraps a packet inside another IP packet.',
  'learning.concept.gre.q1.c.why':
    'MAC switching is L2 forwarding; GRE encapsulates a packet inside an outer IP packet to tunnel it.',
  'learning.concept.gre.q2.a.why':
    'GRE alone has no encryption — that is why GRE-over-IPsec exists; by itself it only encapsulates.',
  'learning.concept.gre.q2.c.why':
    'Address assignment is DHCP; GRE just encapsulates traffic for tunneling, without encryption.',
  'learning.concept.gre.q3.a.why':
    'A tunnel joins whole networks, not collapse them to one host; they appear directly connected over the underlay.',
  'learning.concept.gre.q3.b.why':
    'The point of a tunnel is reachability — the two networks look directly connected across the underlay.',
};
