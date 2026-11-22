import type { Catalog } from '../../../../types';

/** The `icmp` deck's questions (en); its name is in the core chunk. */
export const icmp: Catalog = {
  'learning.concept.icmp.q1.prompt': 'ping uses which protocol?',
  'learning.concept.icmp.q1.a': 'ICMP',
  'learning.concept.icmp.q1.b': 'TCP',
  'learning.concept.icmp.q1.c': 'UDP',
  'learning.concept.icmp.q1.why': 'ping sends ICMP Echo Requests and times the Echo Replies.',
  'learning.concept.icmp.q2.prompt': 'A packet whose TTL reaches 0 triggers…',
  'learning.concept.icmp.q2.a': 'An ARP request being sent',
  'learning.concept.icmp.q2.b': 'ICMP Time Exceeded',
  'learning.concept.icmp.q2.c': 'A TCP RST being sent',
  'learning.concept.icmp.q2.why':
    'The router that decrements TTL to 0 drops the packet and returns ICMP Time Exceeded — the basis of traceroute.',
  'learning.concept.icmp.q3.prompt': 'ICMP mainly carries…',
  'learning.concept.icmp.q3.a': 'Application data for the user',
  'learning.concept.icmp.q3.b': 'Routing tables between routers',
  'learning.concept.icmp.q3.c': 'Error and diagnostic messages',
  'learning.concept.icmp.q3.why':
    'ICMP reports problems (unreachable, fragmentation needed, time exceeded) and supports diagnostics, not user data.',
  'learning.concept.icmp.q1.b.why':
    'ping is not TCP — it has no ports or handshake; it uses ICMP Echo Request/Reply.',
  'learning.concept.icmp.q1.c.why':
    'ping does not use UDP either; it rides directly on ICMP Echo Request/Reply.',
  'learning.concept.icmp.q2.a.why':
    'ARP resolves IP→MAC on the local link; an expired TTL makes the router send ICMP Time Exceeded.',
  'learning.concept.icmp.q2.c.why':
    'A TCP RST aborts a connection; TTL hitting 0 is an L3 event that yields ICMP Time Exceeded.',
  'learning.concept.icmp.q3.a.why':
    'ICMP is not for application payloads; it carries control, error and diagnostic messages.',
  'learning.concept.icmp.q3.b.why':
    'Reachability is distributed by routing protocols — OSPF floods link-state advertisements, BGP advertises prefixes — and each router computes its own table; ICMP carries error/diagnostic messages.',
  'learning.concept.icmp.q4.prompt':
    'A ping to an address nobody routes passes R1 (by its default route), then R2, which has no route. Who sends Destination Unreachable?',
  'learning.concept.icmp.q4.why':
    'The router that cannot go on drops the packet and answers, from the address it received it on: here R2. R1 had a route (its default) and forwarded it.',
  'learning.concept.icmp.q4.a': 'R1, the first router on the way',
  'learning.concept.icmp.q4.a.why':
    'R1 had a route — its default — so it forwarded the packet and had nothing to report.',
  'learning.concept.icmp.q4.b': 'R2, the router with no route',
  'learning.concept.icmp.q4.c': 'The destination, which is unknown',
  'learning.concept.icmp.q4.c.why':
    'An address nobody routes to has no host to answer; the packet never got there.',
  'learning.concept.icmp.q5.prompt':
    "1,500 bytes with Don't Fragment set meet a link of MTU 1,400. What does the router send back?",
  'learning.concept.icmp.q5.why':
    "It may not split the packet, so it drops it and answers Destination Unreachable, fragmentation needed (type 3, code 4), quoting the next hop's MTU; the sender then sends smaller packets (path MTU discovery).",
  'learning.concept.icmp.q5.a': 'Time Exceeded, type 11, code 0',
  'learning.concept.icmp.q5.a.why':
    'Time Exceeded is for a TTL that runs out; the TTL here is fine.',
  'learning.concept.icmp.q5.b': 'Two fragments of 1,400 and 120 bytes',
  'learning.concept.icmp.q5.b.why':
    'Splitting is what DF forbids; without DF the router would fragment.',
  'learning.concept.icmp.q5.c': 'Unreachable code 4, with MTU 1400',
  'learning.concept.icmp.q6.prompt':
    'ping sends one kind of ICMP message and gets another back. Which types are they?',
  'learning.concept.icmp.q6.why':
    'ping sends Echo Request (type 8); the destination answers Echo Reply (type 0) from its own address.',
  'learning.concept.icmp.q6.a': 'Echo Request 8, then Echo Reply 0',
  'learning.concept.icmp.q6.b': 'Echo Request 0, then Echo Reply 8',
  'learning.concept.icmp.q6.b.why':
    'The numbers are the other way round: the request is 8, the reply 0.',
  'learning.concept.icmp.q6.c': 'Both are type 3, with codes 0 and 1',
  'learning.concept.icmp.q6.c.why':
    "Type 3 is Destination Unreachable, an error, not ping's request or reply.",
};
