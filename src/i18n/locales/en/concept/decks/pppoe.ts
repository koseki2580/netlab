import type { Catalog } from '../../../../types';

/** The `pppoe` deck's questions (en); its name is in the core chunk. */
export const pppoe: Catalog = {
  'learning.concept.pppoe.q1.b.why':
    'Routing between networks is L3 routers; PPP is link-layer encapsulation and authentication over one point-to-point link.',
  'learning.concept.pppoe.q1.c.why':
    'PPP does not allocate internet-wide IPs; it encapsulates and authenticates a single point-to-point link.',
  'learning.concept.pppoe.q2.a.why':
    'PPPoE does not encrypt; it carries PPP sessions inside Ethernet so many subscribers share one access network.',
  'learning.concept.pppoe.q2.c.why':
    'PPPoE does not replace IP addressing; it puts PPP inside Ethernet frames for shared DSL/Ethernet access.',
  'learning.concept.pppoe.q3.a.why':
    'Discovery does no encryption; it finds and selects an access concentrator and sets up a session id.',
  'learning.concept.pppoe.q3.b.why':
    'IP assignment happens later in the PPP session (IPCP); Discovery just locates the concentrator and gets a session id.',
  'learning.concept.pppoe.q1.prompt': 'PPP (Point-to-Point Protocol) provides…',
  'learning.concept.pppoe.q1.a': 'Link-layer encapsulation and authentication (PAP/CHAP)',
  'learning.concept.pppoe.q1.b': 'Routing between many different networks',
  'learning.concept.pppoe.q1.c': 'Public IP allocation for the whole internet',
  'learning.concept.pppoe.q1.why':
    'PPP frames traffic on a single link and can authenticate the peer and negotiate addresses (via IPCP).',
  'learning.concept.pppoe.q2.prompt': 'PPPoE adds to PPP the ability to…',
  'learning.concept.pppoe.q2.a': 'Encrypt every packet between subscriber and ISP',
  'learning.concept.pppoe.q2.b': 'Carry PPP sessions inside Ethernet frames',
  'learning.concept.pppoe.q2.c': 'Replace IP addressing with its own scheme',
  'learning.concept.pppoe.q2.why':
    'PPPoE (PPP over Ethernet) runs per-subscriber PPP sessions over a shared Ethernet access network — common in DSL.',
  'learning.concept.pppoe.q3.prompt': 'The PPPoE Discovery stage (PADI/PADO/PADR/PADS)…',
  'learning.concept.pppoe.q3.a': 'Encrypts the session keys for the link',
  'learning.concept.pppoe.q3.b': 'Assigns the customer’s own IP address',
  'learning.concept.pppoe.q3.c': 'Finds an access concentrator and a session ID',
  'learning.concept.pppoe.q3.why':
    'Discovery (PADI→PADO→PADR→PADS) picks the access concentrator and assigns a session ID; the PPP session phase then runs over it.',
};
