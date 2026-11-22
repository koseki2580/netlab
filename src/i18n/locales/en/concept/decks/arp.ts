import type { Catalog } from '../../../../types';

/** The `arp` deck's questions (en); its name is in the core chunk. */
export const arp: Catalog = {
  'learning.concept.arp.q1.prompt': 'What does ARP resolve?',
  'learning.concept.arp.q1.a': 'An IPv4 address to a MAC address',
  'learning.concept.arp.q1.b': 'A hostname to an IP address',
  'learning.concept.arp.q1.c': 'A MAC address to a switch port',
  'learning.concept.arp.q1.why':
    'ARP maps a known IPv4 address to the link-layer MAC needed to frame the packet on the LAN.',
  'learning.concept.arp.q2.prompt': 'An ARP request is sent to which destination MAC?',
  'learning.concept.arp.q2.a': 'The target host’s own MAC address',
  'learning.concept.arp.q2.b': 'The broadcast address ff:ff:ff:ff:ff:ff',
  'learning.concept.arp.q2.c': 'The default gateway’s MAC address',
  'learning.concept.arp.q2.why':
    'The sender doesn’t know the target MAC yet, so the request is broadcast to every host on the segment.',
  'learning.concept.arp.q3.prompt': 'ARP operates within…',
  'learning.concept.arp.q3.a': 'The entire internet end to end',
  'learning.concept.arp.q3.b': 'Only between two routers',
  'learning.concept.arp.q3.c': 'A single broadcast domain',
  'learning.concept.arp.q3.why':
    'ARP is link-local; to reach a remote network you ARP for the gateway, not the remote host.',
  'learning.concept.arp.q4.prompt':
    'ARP is needed because a host knows the destination IP but not its…',
  'learning.concept.arp.q4.a': 'MAC address',
  'learning.concept.arp.q4.b': 'Port number',
  'learning.concept.arp.q4.c': 'Hostname (DNS name)',
  'learning.concept.arp.q4.why':
    'To build the L2 frame the host must learn the MAC that owns that IP on the local link.',
  'learning.concept.arp.q5.prompt': 'ARP replies are cached so that…',
  'learning.concept.arp.q5.a': 'The network deliberately stays slow',
  'learning.concept.arp.q5.b': 'The host need not ARP before every packet',
  'learning.concept.arp.q5.c': 'IP addresses change more often',
  'learning.concept.arp.q5.why':
    'The ARP cache skips a broadcast lookup before each frame; entries expire after a timeout.',
  'learning.concept.arp.q1.b.why':
    'Mapping a hostname to an IP is DNS; ARP maps a known IP to its MAC on the local link.',
  'learning.concept.arp.q1.c.why':
    'A switch learns MAC→port on its own; ARP resolves an IP to a MAC, not a MAC to a port.',
  'learning.concept.arp.q2.a.why':
    'You do not know the target’s MAC yet — that is exactly what ARP is asking for — so the request must broadcast.',
  'learning.concept.arp.q2.c.why':
    'The gateway only matters for off-subnet traffic; an ARP request broadcasts to the whole LAN.',
  'learning.concept.arp.q3.a.why':
    'ARP cannot cross routers; it works only inside one broadcast domain, never the whole internet.',
  'learning.concept.arp.q3.b.why':
    'ARP is not limited to routers — any host on the segment ARPs for a neighbor’s IP, and routers on the same segment ARP each other too.',
  'learning.concept.arp.q4.b.why':
    'A port (L4) selects an application, not a frame’s destination; what ARP supplies is the missing MAC.',
  'learning.concept.arp.q4.c.why':
    'The hostname was resolved earlier by DNS; what the host still lacks to build the frame is the MAC.',
  'learning.concept.arp.q5.a.why':
    'Caching makes the network FASTER, not slower — it avoids an ARP round-trip before each packet.',
  'learning.concept.arp.q5.c.why':
    'Caching does not change IP addresses; it just remembers the IP→MAC mapping for a while.',
};
