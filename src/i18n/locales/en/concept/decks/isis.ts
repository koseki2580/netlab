import type { Catalog } from '../../../../types';

/** The `isis` deck's questions (en); its name is in the core chunk. */
export const isis: Catalog = {
  'learning.concept.isis.q1.b.why':
    'Distance-vector is RIP/EIGRP; IS-IS is a link-state IGP like OSPF, common in ISP cores.',
  'learning.concept.isis.q1.c.why':
    'IS-IS is not an application protocol; it is a link-state routing IGP used in large cores.',
  'learning.concept.isis.q2.a.why':
    'Like OSPF, IS-IS uses link cost, not hop count; what differs is it runs directly on L2, not inside IP.',
  'learning.concept.isis.q2.c.why':
    'IS-IS does not use TCP — it runs directly on the link layer, whereas OSPF rides in IP.',
  'learning.concept.isis.q3.a.why':
    'AS-path is BGP’s; both OSPF and IS-IS run Dijkstra/SPF over total link cost.',
  'learning.concept.isis.q3.b.why':
    'MAC addresses are L2 forwarding; these link-state IGPs pick paths by shortest total link cost.',
  'learning.concept.isis.q1.prompt': 'IS-IS is a…',
  'learning.concept.isis.q1.a': 'A link-state IGP, like OSPF',
  'learning.concept.isis.q1.b': 'A distance-vector protocol',
  'learning.concept.isis.q1.c': 'An application-layer protocol',
  'learning.concept.isis.q1.why':
    'IS-IS is an IGP (interior gateway protocol): it floods link state and runs SPF, and is widely used in large service-provider networks.',
  'learning.concept.isis.q2.prompt': 'Compared with OSPF, IS-IS…',
  'learning.concept.isis.q2.a': 'Uses hop count as its only metric',
  'learning.concept.isis.q2.b': 'Runs directly on the link layer, not inside IP',
  'learning.concept.isis.q2.c': 'Requires a TCP session between neighbors',
  'learning.concept.isis.q2.why':
    'IS-IS PDUs ride directly on L2 — a design difference from OSPF, which runs over IP.',
  'learning.concept.isis.q3.prompt': 'Both OSPF and IS-IS choose paths by…',
  'learning.concept.isis.q3.a': 'The shortest AS-path length',
  'learning.concept.isis.q3.b': 'The lowest MAC address',
  'learning.concept.isis.q3.c': 'The shortest total link cost',
  'learning.concept.isis.q3.why':
    'Both are link-state protocols that compute least-cost paths with SPF.',
};
