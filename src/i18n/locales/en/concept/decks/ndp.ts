import type { Catalog } from '../../../../types';

/** The `ndp` deck's questions (en); its name is in the core chunk. */
export const ndp: Catalog = {
  'learning.concept.ndp.q1.b.why':
    'Inter-AS routing is BGP; NDP takes over ARP’s job — resolving a neighbor’s IP to its MAC.',
  'learning.concept.ndp.q1.c.why':
    'NDP does not encrypt; it replaces ARP, resolving neighbor IP→MAC via ICMPv6 messages.',
  'learning.concept.ndp.q2.a.why':
    'SLAAC never guesses the network part — the prefix always comes from the Router Advertisement; only the interface-ID half may be randomized.',
  'learning.concept.ndp.q2.c.why':
    'The host does not copy the router’s address; it builds its own from the advertised prefix plus an interface ID.',
  'learning.concept.ndp.q3.a.why':
    'DAD does not encrypt; it sends a Neighbor Solicitation to check the address is not already in use.',
  'learning.concept.ndp.q3.b.why':
    'DAD does not compress addresses; it verifies uniqueness by soliciting for the tentative address first.',
  'learning.concept.ndp.q1.prompt': 'In IPv6, which IPv4 protocol does NDP replace?',
  'learning.concept.ndp.q1.a': 'ARP — resolving a neighbor IP to its MAC address',
  'learning.concept.ndp.q1.b': 'BGP — routing between autonomous systems',
  'learning.concept.ndp.q1.c': 'IPsec — encrypting traffic',
  'learning.concept.ndp.q1.why':
    'NDP runs over ICMPv6: Neighbor Solicitation/Advertisement replace ARP, and Router Solicitation/Advertisement handle router discovery.',
  'learning.concept.ndp.q2.prompt':
    'How does SLAAC let a host get an address without a DHCP server?',
  'learning.concept.ndp.q2.a': 'It guesses an address at random and hopes no one else has it',
  'learning.concept.ndp.q2.b':
    'A Router Advertisement supplies the prefix and the host adds an interface ID',
  'learning.concept.ndp.q2.c': 'It copies the router’s address and changes the last digit',
  'learning.concept.ndp.q2.why':
    'Stateless Address Autoconfiguration: the RA carries the /64 prefix; the host appends an interface ID (EUI-64 or random) to build a global address.',
  'learning.concept.ndp.q3.prompt': 'What is Duplicate Address Detection (DAD)?',
  'learning.concept.ndp.q3.a': 'A way to encrypt the address before use',
  'learning.concept.ndp.q3.b': 'A method to compress addresses for transport',
  'learning.concept.ndp.q3.c': 'A check that no one else already has the address',
  'learning.concept.ndp.q3.why':
    'DAD prevents address collisions: a tentative address is verified with an NS; if a reply comes back, the address is already in use.',
};
