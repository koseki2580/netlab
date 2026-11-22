import type { Catalog } from '../../../../types';

/** The `nat` deck's questions (en); its name is in the core chunk. */
export const nat: Catalog = {
  'learning.concept.nat.q1.prompt': 'NAT primarily lets…',
  'learning.concept.nat.q1.a': 'Many private hosts share one public IP',
  'learning.concept.nat.q1.b': 'Switches learn MAC addresses faster',
  'learning.concept.nat.q1.c': 'Routers run OSPF to exchange routes',
  'learning.concept.nat.q1.why':
    'Source NAT/PAT rewrites private addresses to a public one (tracking ports) so a whole LAN shares a public IP.',
  'learning.concept.nat.q2.prompt':
    'For inbound connections to reach an internal server you configure…',
  'learning.concept.nat.q2.a': 'A default route on the router',
  'learning.concept.nat.q2.b': 'Port forwarding (DNAT)',
  'learning.concept.nat.q2.c': 'A VLAN trunk on the uplink',
  'learning.concept.nat.q2.why':
    'DNAT maps a public ip:port to an internal host:port so outside clients can reach it.',
  'learning.concept.nat.q3.prompt': 'NAT keeps a translation table to…',
  'learning.concept.nat.q3.a': 'Encrypt the traffic leaving the network',
  'learning.concept.nat.q3.b': 'Elect a root bridge for the segment',
  'learning.concept.nat.q3.c': 'Match replies back to the right inside host',
  'learning.concept.nat.q3.why':
    'The table remembers each inside-local↔inside-global mapping so return packets are translated back correctly.',
  'learning.concept.nat.q1.b.why':
    'Switch MAC learning is an L2 function; NAT’s job is letting many private hosts share one public IP.',
  'learning.concept.nat.q1.c.why':
    'OSPF is a routing protocol; NAT instead rewrites addresses so a private network shares a public IP.',
  'learning.concept.nat.q2.a.why':
    'A default route sends outbound traffic out; reaching an inside server from outside needs port forwarding (DNAT).',
  'learning.concept.nat.q2.c.why':
    'A VLAN trunk carries L2 VLANs between switches; exposing an inside server uses port forwarding (DNAT).',
  'learning.concept.nat.q3.a.why':
    'NAT does not encrypt; the table exists so replies map back to the correct inside host and port.',
  'learning.concept.nat.q3.b.why':
    'Root-bridge election is STP (L2); NAT’s table matches return traffic to the right inside host.',
};
