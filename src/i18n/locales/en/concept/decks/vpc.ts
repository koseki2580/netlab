import type { Catalog } from '../../../../types';

/** The `vpc` deck's questions (en); its name is in the core chunk. */
export const vpc: Catalog = {
  'learning.concept.vpc.q1.prompt':
    'In the VPC, web (10.0.1.10) sits in the public subnet; the security group lets in TCP 80. An internet user opens http://198.51.100.1/, web’s public address. The request…',
  'learning.concept.vpc.q1.a': 'Is stopped: web has only a private address',
  'learning.concept.vpc.q1.b': 'Reaches web, its destination rewritten to 10.0.1.10',
  'learning.concept.vpc.q1.c': 'Reaches web unchanged, as web holds that address',
  'learning.concept.vpc.q1.why':
    'The internet gateway maps the public address to web’s private one, and the security group lets TCP 80 through. In a cloud this is the instance’s public (elastic) IP.',
  'learning.concept.vpc.q2.prompt':
    'db, in the private subnet (10.0.2.10), connects out to the internet for an update. The connection…',
  'learning.concept.vpc.q2.a': 'Gets out, its source rewritten by both gateways',
  'learning.concept.vpc.q2.b': 'Is stopped: a private subnet has no way out',
  'learning.concept.vpc.q2.c': 'Gets out with 10.0.2.10 as its source address',
  'learning.concept.vpc.q2.why':
    'The private subnet’s route table sends it to the NAT gateway, which puts its own address on it; the internet gateway then puts the public one. Replies come back; nothing outside can start a connection in.',
  'learning.concept.vpc.q3.prompt':
    'An internet user connects straight to db at 10.0.2.10 on port 80, a port the security group allows. The connection…',
  'learning.concept.vpc.q3.a': 'Reaches db, as the security group allows port 80',
  'learning.concept.vpc.q3.b': 'Reaches db through the NAT gateway, coming in',
  'learning.concept.vpc.q3.c': 'Is stopped at the internet gateway, with no mapping',
  'learning.concept.vpc.q3.why':
    'A private address has no mapping at the internet gateway, so nothing comes in to it (on the real internet 10.0.0.0/8 is not even routed). That is what “private subnet” means.',
  'learning.concept.vpc.q4.prompt':
    'The gateway maps web’s public address on ports 80 and 22 to web. An internet user tries SSH (TCP 22) to that address. It…',
  'learning.concept.vpc.q4.a': 'Reaches web, as port 22 is mapped to it too',
  'learning.concept.vpc.q4.b': 'Is stopped by the security group, before web',
  'learning.concept.vpc.q4.c': 'Reaches web, then web refuses the connection',
  'learning.concept.vpc.q4.why':
    'The mapping would lead to web, but the security group lets in only TCP 80, so TCP 22 is dropped first. Open SSH only to an administrator’s address, never to everyone.',
  'learning.concept.vpc.q1.a.why':
    'Its private address is not reachable from outside, but the internet gateway maps the public address to it, so the request gets in.',
  'learning.concept.vpc.q1.c.why':
    'web itself knows only 10.0.1.10; the internet gateway holds the public address and rewrites the destination on the way in.',
  'learning.concept.vpc.q2.b.why':
    'A private subnet cannot be reached from outside, but it can reach out: its route table sends traffic to the NAT gateway.',
  'learning.concept.vpc.q2.c.why':
    'A 10.x source could not be answered across the internet; the NAT gateway and then the internet gateway rewrite it on the way out.',
  'learning.concept.vpc.q3.a.why':
    'The security group only filters what can reach an address; a private address has no way in at the internet gateway at all.',
  'learning.concept.vpc.q3.b.why':
    'The NAT gateway lets connections out and their replies back, but never lets the outside start one in.',
  'learning.concept.vpc.q4.a.why':
    'A mapping says where a packet would go; the security group decides whether it gets in, and it lets in only TCP 80.',
  'learning.concept.vpc.q4.c.why':
    'The packet never reaches web: the security group in front of it drops TCP 22 first.',
};
