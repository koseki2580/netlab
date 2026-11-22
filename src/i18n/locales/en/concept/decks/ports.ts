import type { Catalog } from '../../../../types';

/** The `ports` deck's questions (en); its name is in the core chunk. */
export const ports: Catalog = {
  'learning.concept.ports.q1.prompt': 'A port number identifies…',
  'learning.concept.ports.q1.a': 'Which application/service on a host',
  'learning.concept.ports.q1.b': 'Which router the packet should use',
  'learning.concept.ports.q1.c': 'The MAC address of the host',
  'learning.concept.ports.q1.why':
    'Ports let one host run many services at once; the IP finds the host, the port finds the service.',
  'learning.concept.ports.q2.prompt': 'A TCP connection is uniquely identified by…',
  'learning.concept.ports.q2.a': 'Just the destination IP address',
  'learning.concept.ports.q2.b': 'The 5-tuple of source/destination IP, port and protocol',
  'learning.concept.ports.q2.c': 'The pair of source and destination MAC addresses',
  'learning.concept.ports.q2.why':
    'The 5-tuple lets a server keep thousands of simultaneous connections apart, even to the same port.',
  'learning.concept.ports.q3.prompt': 'HTTPS servers listen by default on port…',
  'learning.concept.ports.q3.a': '22',
  'learning.concept.ports.q3.b': '53',
  'learning.concept.ports.q3.c': '443',
  'learning.concept.ports.q3.why':
    '443 is HTTPS, 80 is HTTP, 22 is SSH, 53 is DNS — the well-known ports below 1024.',
  'learning.concept.ports.q4.prompt': 'One server handles many clients on port 443 because…',
  'learning.concept.ports.q4.a': 'It tells clients apart by their source IP and port',
  'learning.concept.ports.q4.b': 'It opens a new IP address for each client',
  'learning.concept.ports.q4.c': 'It can only serve one client at a time',
  'learning.concept.ports.q4.why':
    'The server port is shared; connections are told apart by the client side of the tuple.',
  'learning.concept.ports.q5.prompt': 'A socket is…',
  'learning.concept.ports.q5.a': 'A kind of connector on a network cable',
  'learning.concept.ports.q5.b': 'An endpoint = an IP address plus a port',
  'learning.concept.ports.q5.c': 'A routing protocol for endpoints',
  'learning.concept.ports.q5.why':
    'A socket binds a service to (IP, port); a connection joins two sockets.',
  'learning.concept.ports.q6.prompt': 'A DNS lookup then a web fetch typically use…',
  'learning.concept.ports.q6.a': 'Both of them over TCP port 80',
  'learning.concept.ports.q6.b': 'Both of them over ICMP instead',
  'learning.concept.ports.q6.c': 'DNS over UDP/53, then HTTPS over TCP/443',
  'learning.concept.ports.q6.why':
    'A small DNS query goes over UDP/53; the page is then fetched over a reliable TCP/443 connection.',
  'learning.concept.ports.q1.b.why':
    'Choosing a router is IP routing (L3); a port selects the application on the host (L4).',
  'learning.concept.ports.q1.c.why':
    'The MAC is an L2 hardware address; a port is an L4 number identifying the service.',
  'learning.concept.ports.q2.a.why':
    'The destination IP alone cannot separate many connections to the same server — you need the full 5-tuple.',
  'learning.concept.ports.q2.c.why':
    'MACs change at every hop and are L2; a connection is identified by the L3/L4 5-tuple.',
  'learning.concept.ports.q3.a.why': 'Port 22 is SSH; HTTPS listens on 443.',
  'learning.concept.ports.q3.b.why': 'Port 53 is DNS; HTTPS listens on 443.',
  'learning.concept.ports.q4.b.why':
    'The server keeps one IP; clients are told apart by their source IP/port, not by new server IPs.',
  'learning.concept.ports.q4.c.why':
    'Servers handle many clients at once on one port — the differing client side of the tuple keeps them separate.',
  'learning.concept.ports.q5.a.why':
    'A socket is not hardware; it is a software endpoint — an IP address paired with a port.',
  'learning.concept.ports.q5.c.why':
    'A routing protocol (like OSPF) tells routers which paths exist so they can forward packets; a socket is just a connection endpoint.',
  'learning.concept.ports.q6.a.why':
    'DNS normally uses UDP/53, and the modern web uses HTTPS on TCP/443 — not plain TCP/80 for both.',
  'learning.concept.ports.q6.b.why':
    'ICMP is for diagnostics (ping); DNS uses UDP/53 and the web fetch uses TCP/443.',
};
