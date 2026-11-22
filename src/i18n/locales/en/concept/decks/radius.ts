import type { Catalog } from '../../../../types';

/** The `radius` deck's questions (en); its name is in the core chunk. */
export const radius: Catalog = {
  'learning.concept.radius.q1.b.why':
    'Routing moves packets between networks; 802.1X is port-based access control — authenticate before the port opens.',
  'learning.concept.radius.q1.c.why':
    'Name resolution is DNS; 802.1X gates network access until the device authenticates.',
  'learning.concept.radius.q2.a.why':
    'RADIUS is not a routing protocol; it is an AAA server protocol — Authentication, Authorization, Accounting.',
  'learning.concept.radius.q2.c.why':
    'Tunneling carries traffic (L2TP/GRE); RADIUS handles AAA — Authentication, Authorization, Accounting.',
  'learning.concept.radius.q3.a.why':
    'The supplicant is the client trying to connect; the switch/AP relaying its credentials is the authenticator.',
  'learning.concept.radius.q3.b.why':
    'A DNS server resolves names; the device passing credentials to the RADIUS server is the authenticator.',
  'learning.concept.radius.q1.prompt': '802.1X provides…',
  'learning.concept.radius.q1.a': 'Port-based network access control',
  'learning.concept.radius.q1.b': 'Routing between networks',
  'learning.concept.radius.q1.c': 'Name-to-address resolution',
  'learning.concept.radius.q1.why':
    '802.1X gates a switch port or Wi-Fi until the client authenticates.',
  'learning.concept.radius.q2.prompt': 'RADIUS is a…',
  'learning.concept.radius.q2.a': 'A routing protocol',
  'learning.concept.radius.q2.b': 'An AAA server protocol',
  'learning.concept.radius.q2.c': 'A tunneling protocol',
  'learning.concept.radius.q2.why':
    'RADIUS centralizes who-can-access decisions and logging for network devices.',
  'learning.concept.radius.q3.prompt': 'In 802.1X, the switch/AP relaying credentials is the…',
  'learning.concept.radius.q3.a': 'Supplicant',
  'learning.concept.radius.q3.b': 'DNS server',
  'learning.concept.radius.q3.c': 'Authenticator',
  'learning.concept.radius.q3.why':
    'Supplicant (client) ↔ Authenticator (switch/AP) ↔ Authentication server (RADIUS).',
};
