import type { Catalog } from '../../../../types';

/** The `vxlan` deck's questions (en); its name is in the core chunk. */
export const vxlan: Catalog = {
  'learning.concept.vxlan.q1.prompt': 'VXLAN carries…',
  'learning.concept.vxlan.q1.a': 'Layer-2 frames inside UDP/IP (L2 over L3)',
  'learning.concept.vxlan.q1.b': 'Only IPv6 packets, never IPv4',
  'learning.concept.vxlan.q1.c': 'Routing tables between peers',
  'learning.concept.vxlan.q1.why':
    'VXLAN tunnels Ethernet frames in UDP so a stretched L2 segment can span a routed (L3) data-center fabric.',
  'learning.concept.vxlan.q2.prompt': 'A VXLAN segment is identified by a…',
  'learning.concept.vxlan.q2.a': 'A VLAN ID (12-bit)',
  'learning.concept.vxlan.q2.b': 'A VNI (24-bit identifier)',
  'learning.concept.vxlan.q2.c': 'A destination MAC address',
  'learning.concept.vxlan.q2.why':
    'The 24-bit VNI allows about 16 million segments, far beyond the 4094 of 802.1Q VLANs.',
  'learning.concept.vxlan.q3.prompt': 'EVPN is commonly used with VXLAN to…',
  'learning.concept.vxlan.q3.a': 'Encrypt frames between the tunnel ends',
  'learning.concept.vxlan.q3.b': 'Assign IP addresses to the tenants',
  'learning.concept.vxlan.q3.c': 'Distribute MAC/IP reachability via BGP',
  'learning.concept.vxlan.q3.why':
    'EVPN (a BGP address family) advertises which MACs/IPs live behind which tunnel endpoints, replacing flood-and-learn.',
  'learning.concept.vxlan.q1.b.why':
    'VXLAN is not IPv6-only; it tunnels L2 frames inside UDP/IP (L2 over L3) regardless of inner protocol.',
  'learning.concept.vxlan.q1.c.why':
    'VXLAN does not carry routing tables; it encapsulates L2 frames in UDP/IP to stretch a segment over L3.',
  'learning.concept.vxlan.q2.a.why':
    'A 12-bit VLAN ID caps at ~4094; VXLAN uses a 24-bit VNI for ~16M segments.',
  'learning.concept.vxlan.q2.c.why':
    'A MAC identifies a host, not a segment; VXLAN segments are identified by the 24-bit VNI.',
  'learning.concept.vxlan.q3.a.why':
    'EVPN is a control plane, not encryption; it distributes MAC/IP reachability via BGP.',
  'learning.concept.vxlan.q3.b.why':
    'Address assignment is DHCP; EVPN gives VXLAN a BGP control plane to advertise MAC/IP reachability.',
};
