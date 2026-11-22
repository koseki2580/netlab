import type { Catalog } from '../../../../types';

/** The `ipv4` deck's questions (en); its name is in the core chunk. */
export const ipv4: Catalog = {
  'learning.concept.ipv4.q1.prompt': 'The IPv4 TTL field…',
  'learning.concept.ipv4.q1.a': 'Encrypts the packet as it crosses each router',
  'learning.concept.ipv4.q1.b': 'Is decremented by each router to prevent loops',
  'learning.concept.ipv4.q1.c': 'Sets the priority of the packet in queues',
  'learning.concept.ipv4.q1.why':
    'Every hop decrements TTL; at 0 the packet is dropped, bounding how long it can circulate.',
  'learning.concept.ipv4.q2.prompt': 'An IPv4 address is…',
  'learning.concept.ipv4.q2.a': '32 bits',
  'learning.concept.ipv4.q2.b': '48 bits',
  'learning.concept.ipv4.q2.c': '128 bits',
  'learning.concept.ipv4.q2.why':
    'IPv4 is 32-bit, shown as dotted decimal like 192.168.1.1; 48-bit is MAC, 128-bit is IPv6.',
  'learning.concept.ipv4.q3.prompt':
    'If a packet exceeds the link MTU and DF is clear, the router…',
  'learning.concept.ipv4.q3.a': 'Drops it silently',
  'learning.concept.ipv4.q3.b': 'Encrypts it',
  'learning.concept.ipv4.q3.c': 'Fragments it',
  'learning.concept.ipv4.q3.why':
    'IPv4 routers fragment oversized packets unless the Don’t-Fragment bit is set, when they return ICMP instead.',
  'learning.concept.ipv4.q4.prompt': 'The network vs host split of an IPv4 address is set by…',
  'learning.concept.ipv4.q4.a': 'The subnet mask / prefix length',
  'learning.concept.ipv4.q4.b': 'The TTL field in the header',
  'learning.concept.ipv4.q4.c': 'The transport port number',
  'learning.concept.ipv4.q4.why':
    'The mask says how many leading bits are the network; the remaining bits identify the host.',
  'learning.concept.ipv4.q5.prompt': 'In a routing table, 0.0.0.0/0 is…',
  'learning.concept.ipv4.q5.a': 'A broadcast address for the subnet',
  'learning.concept.ipv4.q5.b': 'The default route — it matches anything',
  'learning.concept.ipv4.q5.c': 'An invalid entry that is ignored',
  'learning.concept.ipv4.q5.why':
    'The all-zeros /0 matches every destination and is used when no more specific route does.',
  'learning.concept.ipv4.q1.a.why':
    'TTL does not encrypt; it is a hop counter each router decrements to stop packets looping forever.',
  'learning.concept.ipv4.q1.c.why':
    'Priority is the DSCP/ToS field; TTL is a hop limit that prevents endless loops.',
  'learning.concept.ipv4.q2.b.why':
    '48 bits is a MAC address; an IPv4 address is 32 bits (four octets).',
  'learning.concept.ipv4.q2.c.why': '128 bits is an IPv6 address; IPv4 is 32 bits.',
  'learning.concept.ipv4.q3.a.why':
    'It is only dropped if DF is set; with DF clear the router fragments the packet to fit the MTU.',
  'learning.concept.ipv4.q3.b.why':
    'Routers do not encrypt; an oversized packet with DF clear is fragmented to fit the link MTU.',
  'learning.concept.ipv4.q4.b.why':
    'TTL is a hop counter, unrelated to addressing; the mask/prefix length sets the network/host split.',
  'learning.concept.ipv4.q4.c.why':
    'A port is L4; the network-vs-host boundary comes from the subnet mask / prefix length.',
  'learning.concept.ipv4.q5.a.why':
    'The broadcast is 255.255.255.255; 0.0.0.0/0 is the default route that matches every destination.',
  'learning.concept.ipv4.q5.c.why':
    '0.0.0.0/0 is perfectly valid — it is the default route, the least-specific match for any address.',
};
