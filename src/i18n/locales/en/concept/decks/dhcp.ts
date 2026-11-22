import type { Catalog } from '../../../../types';

/** The `dhcp` deck's questions (en); its name is in the core chunk. */
export const dhcp: Catalog = {
  'learning.concept.dhcp.q1.prompt': 'The DHCP four-step exchange is…',
  'learning.concept.dhcp.q1.a': 'SYN, SYN-ACK, ACK, FIN',
  'learning.concept.dhcp.q1.b': 'Discover, Offer, Request, Ack (DORA)',
  'learning.concept.dhcp.q1.c': 'Query, Response, Renew, Release',
  'learning.concept.dhcp.q1.why':
    'The client Discovers, the server Offers, the client Requests, the server Acks the lease.',
  'learning.concept.dhcp.q2.prompt': 'The first DHCP Discover is sent as…',
  'learning.concept.dhcp.q2.a': 'A broadcast',
  'learning.concept.dhcp.q2.b': 'A unicast to the server',
  'learning.concept.dhcp.q2.c': 'A multicast to routers',
  'learning.concept.dhcp.q2.why':
    'The client has no IP yet and doesn’t know the server, so Discover is broadcast.',
  'learning.concept.dhcp.q3.prompt': 'Besides an IP address, DHCP commonly provides…',
  'learning.concept.dhcp.q3.a': 'A MAC address for the interface',
  'learning.concept.dhcp.q3.b': 'A TCP port to listen on',
  'learning.concept.dhcp.q3.c': 'The default gateway and DNS servers',
  'learning.concept.dhcp.q3.why':
    'DHCP options carry gateway, subnet mask, DNS, and lease time alongside the address.',
  'learning.concept.dhcp.q1.a.why':
    'SYN/ACK/FIN is the TCP handshake; DHCP’s four steps are Discover, Offer, Request, Ack.',
  'learning.concept.dhcp.q1.c.why':
    'Those are not the DHCP step names; the exchange is Discover → Offer → Request → Ack (DORA).',
  'learning.concept.dhcp.q2.b.why':
    'Unicasting needs the server’s address — the very thing the client is trying to discover (and it has no source IP of its own either).',
  'learning.concept.dhcp.q2.c.why':
    'Discover is an L2 broadcast on the LAN, not a multicast to routers; the client has no address yet.',
  'learning.concept.dhcp.q3.a.why':
    'A MAC is burned into the NIC, not handed out by DHCP; DHCP provides the gateway and DNS servers.',
  'learning.concept.dhcp.q3.b.why':
    'TCP ports are chosen by applications, not assigned by DHCP; DHCP supplies the gateway and DNS.',
};
