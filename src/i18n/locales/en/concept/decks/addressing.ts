import type { Catalog } from '../../../../types';

/** The `addressing` deck's questions (en); its name is in the core chunk. */
export const addressing: Catalog = {
  'learning.concept.addressing.q1.prompt': 'A MAC address delivers a frame…',
  'learning.concept.addressing.q1.a': 'To the next device on the local link (L2)',
  'learning.concept.addressing.q1.b': 'Across the whole internet by itself',
  'learning.concept.addressing.q1.c': 'To a TCP port on the host',
  'learning.concept.addressing.q1.why':
    'MAC addresses are link-local: they move a frame to the next hop on the same segment and are rewritten at each router.',
  'learning.concept.addressing.q2.prompt': 'An IP address delivers a packet…',
  'learning.concept.addressing.q2.a': 'Only within one cable',
  'learning.concept.addressing.q2.b': 'End-to-end across networks (L3)',
  'learning.concept.addressing.q2.c': 'To a specific application',
  'learning.concept.addressing.q2.why':
    'The IP src/dst stays constant end-to-end (barring NAT); routers use it to choose the path hop by hop.',
  'learning.concept.addressing.q3.prompt':
    'Sending to a host in a DIFFERENT subnet, the frame goes to…',
  'learning.concept.addressing.q3.a': 'The destination host MAC address directly',
  'learning.concept.addressing.q3.b': 'A broadcast that never stops',
  'learning.concept.addressing.q3.c': 'The default gateway MAC, though the IP is the final host',
  'learning.concept.addressing.q3.why':
    'Off-subnet means ARP for the gateway: the L2 destination is the gateway MAC while the L3 destination stays the final host — the core L2/L3 split.',
  'learning.concept.addressing.q4.prompt': 'Private IP ranges (10.0.0.0/8, 192.168.0.0/16) are…',
  'learning.concept.addressing.q4.a': 'Reusable anywhere, never routed on the public internet',
  'learning.concept.addressing.q4.b': 'Globally unique, like public addresses',
  'learning.concept.addressing.q4.c': 'Reserved for routers and switches',
  'learning.concept.addressing.q4.why':
    'Private addresses are reused everywhere behind NAT; only public addresses are globally unique and routable.',
  'learning.concept.addressing.q5.prompt': 'A broadcast reaches…',
  'learning.concept.addressing.q5.a': 'One specific host only',
  'learning.concept.addressing.q5.b': 'Every host in the broadcast domain',
  'learning.concept.addressing.q5.c': 'Only the hosts in a subscribed group',
  'learning.concept.addressing.q5.why':
    'Broadcast = all hosts on the segment (e.g. an ARP request); unicast = one host; multicast = a group that joined.',
  'learning.concept.addressing.q6.prompt': 'Why does the internet need NAT?',
  'learning.concept.addressing.q6.a': 'To encrypt traffic as it leaves the network',
  'learning.concept.addressing.q6.b': 'To resolve names into IP addresses',
  'learning.concept.addressing.q6.c': 'To let private hosts share scarce public IPv4 addresses',
  'learning.concept.addressing.q6.why':
    'NAT lets a whole private network share a few public IPv4 addresses, working around IPv4 exhaustion.',
  'learning.concept.addressing.q1.b.why':
    'A MAC only has meaning on the local link; crossing networks is the IP address’s job (L3).',
  'learning.concept.addressing.q1.c.why':
    'A TCP port picks the application (L4); a MAC just reaches the next device on the wire (L2).',
  'learning.concept.addressing.q2.a.why':
    'Staying on one cable is L2 (the MAC); an IP address routes a packet across many links end-to-end.',
  'learning.concept.addressing.q2.c.why':
    'Reaching a specific application is the port’s job (L4); IP only gets the packet to the host (L3).',
  'learning.concept.addressing.q3.a.why':
    'Off-subnet you cannot reach the host’s MAC directly — it is on another link; you ARP for the gateway instead.',
  'learning.concept.addressing.q3.b.why':
    'Broadcasts do not leave the subnet; the frame goes to the gateway’s MAC, then IP routing takes over.',
  'learning.concept.addressing.q4.b.why':
    'The same private range (e.g. 10.0.0.0/8) appears in millions of networks at once — the opposite of globally unique.',
  'learning.concept.addressing.q4.c.why':
    'Private ranges are for any internal host, not just routers — phones, servers and laptops all use them.',
  'learning.concept.addressing.q5.a.why':
    'Reaching one specific host is unicast; a broadcast is delivered to every host in the domain.',
  'learning.concept.addressing.q5.c.why':
    'Delivery to a subscribed group is multicast; a broadcast goes to everyone in the broadcast domain.',
  'learning.concept.addressing.q6.a.why':
    'Encryption is TLS’s job, not NAT’s; NAT rewrites addresses so private hosts can share a public IP.',
  'learning.concept.addressing.q6.b.why':
    'Name resolution is DNS; NAT exists to stretch scarce IPv4 addresses, not to look up names.',
  'learning.concept.addressing.q7.prompt':
    'A department needs 50 hosts. Which is the smallest subnet that holds them?',
  'learning.concept.addressing.q7.why':
    'A /n holds 2^(32−n) − 2 hosts (network and broadcast addresses taken out): /27 holds 30, too few; /26 holds 62, enough; /25 would waste 64 addresses.',
  'learning.concept.addressing.q7.a': '/27, which holds 30 hosts',
  'learning.concept.addressing.q7.a.why': '30 is fewer than 50: the subnet is too small.',
  'learning.concept.addressing.q7.b': '/26, which holds 62 hosts',
  'learning.concept.addressing.q7.c': '/25, which holds 126 hosts',
  'learning.concept.addressing.q7.c.why':
    'It fits, but /26 fits too and is half the size: VLSM gives each just what it needs.',
  'learning.concept.addressing.q8.prompt':
    'In VLSM, why give the largest department its subnet first?',
  'learning.concept.addressing.q8.why':
    'A subnet must start on a multiple of its own size. Placing the largest first and packing the rest after it keeps every later, smaller subnet on its boundary with no gaps.',
  'learning.concept.addressing.q8.a': 'Larger subnets need more routers',
  'learning.concept.addressing.q8.a.why':
    "The number of routers does not depend on a subnet's size.",
  'learning.concept.addressing.q8.b': 'Small subnets cannot be routed later',
  'learning.concept.addressing.q8.b.why':
    'Any subnet can be routed whenever it is made; order does not change that.',
  'learning.concept.addressing.q8.c': 'So each starts on a multiple of its size',
  'learning.concept.addressing.q9.prompt':
    'The octet 11000000 in binary is which number, and which mask octet?',
  'learning.concept.addressing.q9.why':
    'The bits are worth 128, 64, 32, 16, 8, 4, 2, 1; 11000000 is 128 + 64 = 192. As a mask, two ones in the last octet: /24 + 2 = /26.',
  'learning.concept.addressing.q9.a': '192: two ones, as in /26',
  'learning.concept.addressing.q9.b': '128: one one, as in /25',
  'learning.concept.addressing.q9.b.why': '128 is 10000000, one one; here there are two.',
  'learning.concept.addressing.q9.c': '224: three ones, as in /27',
  'learning.concept.addressing.q9.c.why': '224 is 11100000, three ones; here there are two.',
};
