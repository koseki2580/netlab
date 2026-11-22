import type { Catalog } from '../../../../types';

/** The `ipv6` deck's questions (en); its name is in the core chunk. */
export const ipv6: Catalog = {
  'learning.concept.ipv6.q1.prompt': 'An IPv6 address is…',
  'learning.concept.ipv6.q1.a': '128 bits',
  'learning.concept.ipv6.q1.b': '32 bits',
  'learning.concept.ipv6.q1.c': '64 bits',
  'learning.concept.ipv6.q1.why':
    'IPv6 expands the address to 128 bits, written as eight hex groups.',
  'learning.concept.ipv6.q2.prompt': 'IPv6 replaces ARP with…',
  'learning.concept.ipv6.q2.a': 'DHCP',
  'learning.concept.ipv6.q2.b': 'NDP',
  'learning.concept.ipv6.q2.c': 'STP',
  'learning.concept.ipv6.q2.why':
    'NDP uses ICMPv6 Neighbor Solicitation/Advertisement to resolve link-layer addresses.',
  'learning.concept.ipv6.q3.prompt': 'IPv6 has no…',
  'learning.concept.ipv6.q3.a': 'Routing between networks',
  'learning.concept.ipv6.q3.b': 'Addresses for hosts',
  'learning.concept.ipv6.q3.c': 'Broadcast addressing',
  'learning.concept.ipv6.q3.why':
    'IPv6 drops broadcast entirely; “all-nodes” traffic uses multicast groups instead.',
  'learning.concept.ipv6.q1.b.why': '32 bits is IPv4; an IPv6 address is 128 bits.',
  'learning.concept.ipv6.q1.c.why':
    '64 bits is just the interface-ID half; a full IPv6 address is 128 bits.',
  'learning.concept.ipv6.q2.a.why':
    'DHCP hands out addresses; IPv6 resolves neighbors with NDP (Neighbor Discovery), replacing ARP.',
  'learning.concept.ipv6.q2.c.why':
    'STP prevents L2 loops; the IPv6 successor to ARP is Neighbor Discovery (NDP).',
  'learning.concept.ipv6.q3.a.why':
    'IPv6 of course routes; what it drops is broadcast — it uses multicast instead.',
  'learning.concept.ipv6.q3.b.why':
    'IPv6 is all about addresses (128-bit ones); what it removed is broadcast, replaced by multicast.',
};
