import type { Catalog } from '../../../../types';

/** The `ipv6addr` deck's questions (en); its name is in the core chunk. */
export const ipv6addr: Catalog = {
  'learning.concept.ipv6addr.q1.prompt':
    'How does RFC 5952 write 2001:0db8:0000:0001:0000:0000:0000:0001?',
  'learning.concept.ipv6addr.q1.a': '2001:db8::1:0:0:0:1',
  'learning.concept.ipv6addr.q1.b': '2001:db8:0:1::1',
  'learning.concept.ipv6addr.q1.c': '2001:db8::1::1',
  'learning.concept.ipv6addr.q1.why':
    '“::” goes on the longest run of zero groups. The run of three after :1 is longer than the single zero before it, and a lone zero group is written 0, never “::”.',
  'learning.concept.ipv6addr.q1.a.why':
    'The first zero is a single group, and RFC 5952 never compresses one group; the longer run of three is the one to shorten.',
  'learning.concept.ipv6addr.q1.c.why':
    '“::” may appear only once: with two, nobody could tell how many zero groups each one stands for.',
  'learning.concept.ipv6addr.q2.prompt':
    'A host has fe80::1, fd12:3456:789a:1::1 and ff02::1 on its interface. Which one can a router forward to another subnet of the same site but not onto the internet?',
  'learning.concept.ipv6addr.q2.a': 'fe80::1, the link-local one',
  'learning.concept.ipv6addr.q2.b': 'ff02::1, the multicast group',
  'learning.concept.ipv6addr.q2.c': 'fd12:3456:789a:1::1, a unique local one',
  'learning.concept.ipv6addr.q2.why':
    'fd00::/8 is the in-use half of the unique local range fc00::/7 (RFC 4193): routed inside the site, filtered at its edge.',
  'learning.concept.ipv6addr.q2.a.why':
    'fe80::/10 is link-local: valid only on its own link, and routers never forward it to another one.',
  'learning.concept.ipv6addr.q2.b.why':
    'ff02::1 is the all-nodes group with link scope (the 2 in ff02); it never leaves the link either.',
  'learning.concept.ipv6addr.q3.prompt':
    'An ISP delegates a /56 to a home router. How many /64 LANs can the router make from it?',
  'learning.concept.ipv6addr.q3.a': '256',
  'learning.concept.ipv6addr.q3.b': '8',
  'learning.concept.ipv6addr.q3.c': '65,536',
  'learning.concept.ipv6addr.q3.why':
    '64 − 56 = 8 bits of subnet ID, and 2⁸ = 256. Those bits are the last two hex digits of the 4th group.',
  'learning.concept.ipv6addr.q3.b.why':
    '8 is the number of bits between /56 and /64; each bit doubles the count, so there are 2⁸ LANs, not 8.',
  'learning.concept.ipv6addr.q3.c.why':
    '65,536 /64s fit in a /48, which leaves 16 bits of subnet ID; a /56 has only 8.',
  'learning.concept.ipv6addr.q4.prompt':
    'The router got 2001:db8:1234:5600::/56 and numbers LANs from subnet ID 0, so LAN 1 is …:5600::/64. Which prefix does LAN 11 get?',
  'learning.concept.ipv6addr.q4.a': '2001:db8:1234:5610::/64',
  'learning.concept.ipv6addr.q4.b': '2001:db8:1234:560b::/64',
  'learning.concept.ipv6addr.q4.c': '2001:db8:1234:560a::/64',
  'learning.concept.ipv6addr.q4.why':
    'LAN 11 is subnet ID 10, and 10 in hex is 0a, so the 4th group becomes 560a.',
  'learning.concept.ipv6addr.q4.a.why':
    'That writes decimal 10 as the digits 1 0, but the address is hex: 0x10 is 16, which would be LAN 17.',
  'learning.concept.ipv6addr.q4.b.why':
    '0b is 11, the LAN number; LAN 1 used subnet ID 0, so LAN 11 uses subnet ID 10.',
};
