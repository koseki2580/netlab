import type { Catalog } from '../../../../types';

/** The `bgp` deck's questions (en); its name is in the core chunk. */
export const bgp: Catalog = {
  'learning.concept.bgp.q1.prompt': 'BGP is the protocol that…',
  'learning.concept.bgp.q1.a': 'Routes between autonomous systems',
  'learning.concept.bgp.q1.b': 'Assigns IP addresses to hosts',
  'learning.concept.bgp.q1.c': 'Resolves names into addresses',
  'learning.concept.bgp.q1.why':
    'BGP exchanges reachability between ASes and is how independent networks form the global internet.',
  'learning.concept.bgp.q2.prompt': 'BGP chooses paths primarily by…',
  'learning.concept.bgp.q2.a': 'The route with the lowest hop count',
  'learning.concept.bgp.q2.b': 'Policy and the AS-path (path-vector)',
  'learning.concept.bgp.q2.c': 'The lowest total link cost',
  'learning.concept.bgp.q2.why':
    'BGP is a path-vector protocol; operators apply policy on attributes like AS-path length and local preference.',
  'learning.concept.bgp.q3.prompt': 'An AS in BGP is…',
  'learning.concept.bgp.q3.a': 'A single router with its own routing table',
  'learning.concept.bgp.q3.b': 'A subnet inside one routing domain',
  'learning.concept.bgp.q3.c': 'An autonomous system under one administration',
  'learning.concept.bgp.q3.why': 'Each AS has a number and announces which prefixes it can reach.',
  'learning.concept.bgp.q1.b.why':
    'Address assignment is DHCP; BGP routes reachability between autonomous systems across the internet.',
  'learning.concept.bgp.q1.c.why':
    'Name resolution is DNS; BGP is the inter-AS routing protocol that glues the internet together.',
  'learning.concept.bgp.q2.a.why':
    'BGP is not hop-count based (that’s RIP); it picks paths by policy and AS-path attributes.',
  'learning.concept.bgp.q2.c.why':
    'Link cost is OSPF’s intra-AS metric; BGP decides between ASes by policy and AS-path.',
  'learning.concept.bgp.q3.a.why':
    'An AS is a whole network under one administration, not a single router.',
  'learning.concept.bgp.q3.b.why':
    'A subnet is an L3 address block; an AS is an administrative domain of many networks with its own number.',
};
