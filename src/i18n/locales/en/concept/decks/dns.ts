import type { Catalog } from '../../../../types';

/** The `dns` deck's questions (en); its name is in the core chunk. */
export const dns: Catalog = {
  'learning.concept.dns.q1.prompt': 'DNS translates…',
  'learning.concept.dns.q1.a': 'Hostnames to IP addresses',
  'learning.concept.dns.q1.b': 'IP addresses to MAC addresses',
  'learning.concept.dns.q1.c': 'Ports to service names',
  'learning.concept.dns.q1.why':
    'DNS resolves human names like example.com to the IP addresses needed to connect.',
  'learning.concept.dns.q2.prompt': 'Which record maps a name to an IPv4 address?',
  'learning.concept.dns.q2.a': 'MX',
  'learning.concept.dns.q2.b': 'A',
  'learning.concept.dns.q2.c': 'CNAME',
  'learning.concept.dns.q2.why':
    'An A record holds an IPv4 address; AAAA is IPv6, MX is mail, CNAME is an alias.',
  'learning.concept.dns.q3.prompt': 'A recursive resolver…',
  'learning.concept.dns.q3.a': 'Answers only from the zone it owns',
  'learning.concept.dns.q3.b': 'Only caches MAC addresses it has seen',
  'learning.concept.dns.q3.c': 'Queries other servers until it has the answer',
  'learning.concept.dns.q3.why':
    'The recursive resolver walks the DNS hierarchy (root → TLD → authoritative) and returns the final answer.',
  'learning.concept.dns.q4.prompt': 'Caching DNS answers…',
  'learning.concept.dns.q4.a': 'Speeds up repeat lookups, honoring the TTL',
  'learning.concept.dns.q4.b': 'Changes the IP address that is returned',
  'learning.concept.dns.q4.c': 'Is forbidden by the DNS standard',
  'learning.concept.dns.q4.why':
    'Resolvers cache records for their TTL, so popular names resolve instantly without re-querying.',
  'learning.concept.dns.q5.prompt': 'An AAAA record holds…',
  'learning.concept.dns.q5.a': 'An IPv4 address',
  'learning.concept.dns.q5.b': 'An IPv6 address',
  'learning.concept.dns.q5.c': 'A mail server name',
  'learning.concept.dns.q5.why': 'A = IPv4, AAAA = IPv6, MX = mail exchanger, CNAME = alias.',
  'learning.concept.dns.q1.b.why':
    'IP→MAC is ARP’s job on the local link; DNS maps human names to IP addresses.',
  'learning.concept.dns.q1.c.why':
    'Ports are just well-known numbers; DNS resolves names to IP addresses, not ports to names.',
  'learning.concept.dns.q2.a.why':
    'MX records point to mail servers, not a host’s IPv4; the name→IPv4 record is the A record.',
  'learning.concept.dns.q2.c.why':
    'A CNAME is an alias to another name, not an address; the IPv4 mapping is the A record.',
  'learning.concept.dns.q3.a.why':
    'Answering only from its own zone is an authoritative server; a recursive resolver chases the answer for you.',
  'learning.concept.dns.q3.b.why':
    'DNS caches name→IP answers, not MAC addresses; a recursive resolver queries other servers until the name resolves.',
  'learning.concept.dns.q4.b.why':
    'Caching reuses the existing answer; it never changes the IP — it just serves it until the TTL expires.',
  'learning.concept.dns.q4.c.why':
    'Caching is encouraged, not forbidden — TTLs exist precisely so resolvers can cache safely.',
  'learning.concept.dns.q5.a.why':
    'An IPv4 address lives in an A record; the quad-A (AAAA) record holds an IPv6 address.',
  'learning.concept.dns.q5.c.why':
    'A mail server name is an MX record; AAAA holds an IPv6 address.',
};
