import type { Catalog } from '../../../../types';

/** The `l2tp` deck's questions (en); its name is in the core chunk. */
export const l2tp: Catalog = {
  'learning.concept.l2tp.q1.a.why':
    'L2TP alone has no encryption — that is why it is paired with IPsec; by itself it only tunnels.',
  'learning.concept.l2tp.q1.c.why':
    'Routing between subnets is a router’s L3 job; L2TP is a tunneling protocol with no encryption of its own.',
  'learning.concept.l2tp.q2.b.why':
    'L2TP is not HTTP-specific; it tunnels Layer-2 PPP frames across an IP network between a LAC and an LNS.',
  'learning.concept.l2tp.q2.c.why':
    'BGP exchanges routing tables; L2TP carries L2 PPP frames over IP, it does not move routing tables.',
  'learning.concept.l2tp.q3.a.why':
    'IPsec adds security overhead, not speed; it is paired with L2TP to supply the encryption L2TP lacks.',
  'learning.concept.l2tp.q3.b.why':
    'The pairing is about confidentiality, not NAT — L2TP provides the tunnel and IPsec adds encryption/auth.',
  'learning.concept.l2tp.q1.prompt': 'On its own, L2TP provides…',
  'learning.concept.l2tp.q1.a': 'Strong encryption of all traffic',
  'learning.concept.l2tp.q1.b': 'No encryption — it is a tunneling protocol only',
  'learning.concept.l2tp.q1.c': 'Routing between subnets',
  'learning.concept.l2tp.q1.why':
    'L2TP encapsulates traffic but offers no confidentiality, which is why it is usually paired with IPsec (L2TP/IPsec).',
  'learning.concept.l2tp.q2.prompt': 'L2TP tunnels…',
  'learning.concept.l2tp.q2.a': 'Layer-2 PPP frames across an IP network',
  'learning.concept.l2tp.q2.b': 'Only HTTP requests and responses',
  'learning.concept.l2tp.q2.c': 'BGP routing tables between peers',
  'learning.concept.l2tp.q2.why':
    'L2TP carries PPP sessions over IP between the access concentrator (LAC) and the network server (LNS).',
  'learning.concept.l2tp.q3.prompt': 'L2TP is commonly combined with IPsec because…',
  'learning.concept.l2tp.q3.a': 'IPsec makes the tunnel run faster',
  'learning.concept.l2tp.q3.b': 'L2TP cannot cross NAT at all',
  'learning.concept.l2tp.q3.c': 'L2TP supplies the tunnel; IPsec adds the crypto',
  'learning.concept.l2tp.q3.why':
    'L2TP/IPsec is a common pairing: L2TP for the tunnel, IPsec (ESP) for confidentiality and integrity.',
};
