import type { Catalog } from '../../../../types';

/** The `vrrp` deck's questions (en); its name is in the core chunk. */
export const vrrp: Catalog = {
  'learning.concept.vrrp.q1.prompt': 'VRRP provides…',
  'learning.concept.vrrp.q1.a': 'A redundant default gateway via a virtual IP',
  'learning.concept.vrrp.q1.b': 'Name-to-address resolution',
  'learning.concept.vrrp.q1.c': 'Loop prevention between switches',
  'learning.concept.vrrp.q1.why':
    'Hosts point at one virtual IP; VRRP lets a backup router take it over if the master fails.',
  'learning.concept.vrrp.q2.prompt': 'In VRRP, at a given time the virtual IP is owned by…',
  'learning.concept.vrrp.q2.a': 'All of the routers in the group at once',
  'learning.concept.vrrp.q2.b': 'One master router (others are backups)',
  'learning.concept.vrrp.q2.c': 'The DNS server for the subnet',
  'learning.concept.vrrp.q2.why':
    'One router is master and answers for the virtual IP/MAC; backups monitor and take over on failure.',
  'learning.concept.vrrp.q3.prompt': 'VRRP solves the problem of…',
  'learning.concept.vrrp.q3.a': 'Having too many subnets on one switch',
  'learning.concept.vrrp.q3.b': 'Slow DNS resolution on the clients',
  'learning.concept.vrrp.q3.c': 'The default gateway being a single point of failure',
  'learning.concept.vrrp.q3.why':
    'Without a first-hop redundancy protocol, a dead gateway strands a whole subnet; VRRP removes that SPOF.',
  'learning.concept.vrrp.q1.b.why':
    'Name resolution is DNS; VRRP gives hosts a redundant default gateway behind one virtual IP.',
  'learning.concept.vrrp.q1.c.why':
    'Loop prevention is STP; VRRP makes the default gateway redundant via a shared virtual IP.',
  'learning.concept.vrrp.q2.a.why':
    'If every router answered at once, hosts would get duplicate and conflicting replies — that is why VRRP elects exactly one master.',
  'learning.concept.vrrp.q2.c.why':
    'The DNS server is unrelated; the virtual IP is held by the elected master router, with backups ready.',
  'learning.concept.vrrp.q3.a.why':
    'VRRP is about gateway redundancy, not subnet count; it removes the single-gateway point of failure.',
  'learning.concept.vrrp.q3.b.why':
    'DNS speed is unrelated; VRRP fixes the default gateway being a single point of failure.',
};
