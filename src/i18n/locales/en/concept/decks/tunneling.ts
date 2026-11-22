import type { Catalog } from '../../../../types';

/** The `tunneling` deck's questions (en); its name is in the core chunk. */
export const tunneling: Catalog = {
  'learning.concept.tunneling.q1.b.why':
    'Encryption is a separate add-on (IPsec); tunneling itself just wraps a packet in a new outer header.',
  'learning.concept.tunneling.q1.c.why':
    'Tunneling does not compress; it encapsulates a packet so it can cross a network that otherwise couldn’t carry it.',
  'learning.concept.tunneling.q2.a.why':
    'The outer header must survive the transit; the ingress adds it and only the egress strips it.',
  'learning.concept.tunneling.q2.c.why':
    'It is the sender (ingress) that adds the outer header; the receiver (egress) removes it.',
  'learning.concept.tunneling.q3.a.why':
    'Speed is unrelated; the outer header eats bytes, so the inner payload has less room before fragmenting.',
  'learning.concept.tunneling.q3.b.why':
    'Encryption is optional and not the cause; the extra outer header itself consumes bytes from the MTU.',
  'learning.concept.tunneling.q1.prompt': 'Tunneling (encapsulation) works by…',
  'learning.concept.tunneling.q1.a': 'Wrapping the original packet in a new outer header',
  'learning.concept.tunneling.q1.b': 'Encrypting every packet from end to end',
  'learning.concept.tunneling.q1.c': 'Compressing the payload to save bandwidth',
  'learning.concept.tunneling.q1.why':
    'A tunnel adds an outer header (GRE/IP, VXLAN/UDP, MPLS, …) around the original packet; the inner packet rides as payload across the transit network.',
  'learning.concept.tunneling.q2.prompt': 'At the two ends of a tunnel…',
  'learning.concept.tunneling.q2.a': 'Both ends drop the outer header immediately',
  'learning.concept.tunneling.q2.b': 'The ingress adds the outer header and the egress strips it',
  'learning.concept.tunneling.q2.c': 'Only the receiver adds an outer header',
  'learning.concept.tunneling.q2.why':
    'Encapsulation happens at the tunnel ingress; decapsulation at the egress, which then routes the recovered inner packet normally.',
  'learning.concept.tunneling.q3.prompt': 'Why does tunneling lower the usable MTU?',
  'learning.concept.tunneling.q3.a': 'Because the network path itself runs slower',
  'learning.concept.tunneling.q3.b': 'Because the inner packet is always encrypted',
  'learning.concept.tunneling.q3.c': 'Because the extra outer header consumes bytes',
  'learning.concept.tunneling.q3.why':
    'Outer headers are overhead. If inner + outer exceeds the path MTU with DF set, the packet is dropped — hence clamping the TCP MSS (maximum segment size) or lowering the tunnel MTU.',
};
