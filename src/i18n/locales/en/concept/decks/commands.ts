import type { Catalog } from '../../../../types';

/**
 * The `commands` deck's questions (en): reading command output (REQ-365), what
 * the terminal prints and what it means. Its name is in the core chunk.
 */
export const commands: Catalog = {
  'learning.concept.commands.q1.prompt':
    'ping prints “64 bytes from 10.0.2.80: icmp_seq=1 ttl=63”. The server sends its replies with TTL 64. What does 63 tell you?',
  'learning.concept.commands.q1.why':
    'TTL starts at 64 and every router that forwards the packet takes one off, so 63 means one router lay between. A reply from the router itself arrives with 64.',
  'learning.concept.commands.q1.a': 'One router forwarded the reply on its way back',
  'learning.concept.commands.q1.b': 'The round trip took 63 milliseconds',
  'learning.concept.commands.q1.b.why':
    'TTL is a hop count, not a time: each router that forwards the packet takes one off.',
  'learning.concept.commands.q1.c': 'Only 63 bytes of the reply arrived back',
  'learning.concept.commands.q1.c.why':
    'The size is the 64 bytes at the start of the line; ttl is the IP header’s lifetime field.',
  'learning.concept.commands.q2.prompt':
    'ping prints “From 10.0.1.1 icmp_seq=1 Destination Net Unreachable”. Who sent that message, and why?',
  'learning.concept.commands.q2.why':
    'A router with no route for the destination drops the packet and tells the sender with ICMP Destination Unreachable (type 3, code 0) from its own address: the problem is at or past that router.',
  'learning.concept.commands.q2.a': 'The destination host, which refused the ping',
  'learning.concept.commands.q2.a.why':
    'The destination never got the packet: the message came “From 10.0.1.1”, a router on the way.',
  'learning.concept.commands.q2.b': 'The router 10.0.1.1, with no route onward',
  'learning.concept.commands.q2.c': 'Your own host, after its DNS lookup failed',
  'learning.concept.commands.q2.c.why':
    'A name that does not resolve stops ping before it sends anything; this message is ICMP from a router.',
  'learning.concept.commands.q3.prompt':
    'curl prints “curl: (6) Could not resolve host: www.example.test”. Which step failed?',
  'learning.concept.commands.q3.why':
    'Error (6) means the name could not be resolved: try nslookup on the name, then ping the DNS server, to see whether DNS answers.',
  'learning.concept.commands.q3.a': 'Turning the name into an address (DNS)',
  'learning.concept.commands.q3.b': 'Opening the TCP connection to port 80',
  'learning.concept.commands.q3.b.why':
    "A connection that fails is error (7), “Couldn't connect to server”; curl never got that far.",
  'learning.concept.commands.q3.c': 'The server answered with 404 Not Found',
  'learning.concept.commands.q3.c.why':
    'A 404 is an answer from the server, printed as the page; here no server was asked.',
  'learning.concept.commands.q4.prompt':
    "curl says “Couldn't connect to server”, yet ping to the same address answers. What is the most likely cause?",
  'learning.concept.commands.q4.why':
    'The path works (ping) and the name works (curl tried to connect); the connection to the port is what fails. On a real server: is the web server program running, on that port?',
  'learning.concept.commands.q4.a': 'There is no route to the server at all',
  'learning.concept.commands.q4.a.why': 'ping reached the server, so a route exists both ways.',
  'learning.concept.commands.q4.b': 'DNS cannot resolve the server’s name',
  'learning.concept.commands.q4.b.why':
    'curl got as far as connecting, so the name was already resolved.',
  'learning.concept.commands.q4.c': 'Nothing listens on that port on the server',
  'learning.concept.commands.q5.prompt':
    'traceroute prints “ 1  10.0.1.1 (10.0.1.1)” and then only “* * *” lines. Where should you look for the problem?',
  'learning.concept.commands.q5.why':
    'Each line is one hop: the first router answered, nothing after it did. The fault is in what comes after 10.0.1.1 — its next link, the next router, or the way back.',
  'learning.concept.commands.q5.a': 'At your own host’s address settings',
  'learning.concept.commands.q5.a.why':
    'Your host reached the first router, which answered: its own settings got the probe out.',
  'learning.concept.commands.q5.b': 'Past the first router, 10.0.1.1',
  'learning.concept.commands.q5.c': 'At the DNS server the host uses',
  'learning.concept.commands.q5.c.why':
    'A traceroute to an address needs no DNS, and the probes themselves stopped after hop 1.',
  'learning.concept.commands.q6.prompt':
    'After pinging a server on another network, arp -a shows only “? (10.0.1.1) at 02:00:00:00:00:01 [ether] on eth0”. Why is the server not listed?',
  'learning.concept.commands.q6.why':
    'A host sends a frame for another network to its gateway, so it asks ARP only for the gateway’s MAC. The router asks for the server’s MAC on the server’s own LAN.',
  'learning.concept.commands.q6.a': 'The server did not answer the ARP request',
  'learning.concept.commands.q6.a.why':
    'The ping was answered, so the frames got there; the host never asked for the server’s MAC at all.',
  'learning.concept.commands.q6.b': 'The server’s entry had already expired',
  'learning.concept.commands.q6.b.why':
    'The gateway’s entry from the same ping is still there; the server’s was never made.',
  'learning.concept.commands.q6.c': 'ARP asks only inside the host’s own LAN',
};
